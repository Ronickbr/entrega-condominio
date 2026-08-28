-- ============================================================
-- 0001_auth_rbac.sql
-- Etapa 2 — Autenticação + RBAC + RLS Base
--
-- Tabelas: condominiums, buildings, units, profiles,
--          condo_memberships, audit_logs
-- Triggers: on_auth_user_created, audit_trigger_row, set_updated_at
-- Helpers RLS: get_auth_role, is_super_admin, has_condominium_access
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extensões
-- ------------------------------------------------------------
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 2. Tabela de auditoria (suporte ao audit_trigger_row)
-- ------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  old_values  jsonb,
  new_values  jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity, entity_id);
create index if not exists audit_logs_user_idx
  on public.audit_logs (user_id);
create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

-- ------------------------------------------------------------
-- 3. Condomínios
-- ------------------------------------------------------------
create table if not exists public.condominiums (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  cnpj         text unique,
  phone        text,
  email        text,
  address      jsonb,
  logo_url     text,
  syndic_name  text,
  admin_phone  text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. Perfis (1:1 com auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  email      text not null unique,
  cpf        text unique,
  phone      text,
  role       text not null default 'RESIDENT'
             check (role in ('SUPER_ADMIN', 'SYNDIC', 'DOORMAN', 'RECEPTIONIST', 'RESIDENT')),
  avatar_url text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (email);

-- ------------------------------------------------------------
-- 5. Blocos / Torres
-- ------------------------------------------------------------
create table if not exists public.buildings (
  id              uuid primary key default gen_random_uuid(),
  condominium_id  uuid not null references public.condominiums (id) on delete cascade,
  name            text not null,
  identifier      text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (condominium_id, name)
);

-- ------------------------------------------------------------
-- 6. Unidades
-- ------------------------------------------------------------
create table if not exists public.units (
  id              uuid primary key default gen_random_uuid(),
  condominium_id  uuid not null references public.condominiums (id) on delete cascade,
  building_id     uuid references public.buildings (id) on delete set null,
  number          text not null,
  floor           text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (condominium_id, building_id, number)
);

create index if not exists units_condo_idx on public.units (condominium_id);
create index if not exists units_building_idx on public.units (building_id);

-- ------------------------------------------------------------
-- 7. Vínculo perfil ↔ condomínio (role + unidade por condomínio)
-- ------------------------------------------------------------
create table if not exists public.condo_memberships (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  condominium_id  uuid not null references public.condominiums (id) on delete cascade,
  unit_id         uuid references public.units (id) on delete set null,
  role            text not null default 'RESIDENT'
                  check (role in ('SUPER_ADMIN', 'SYNDIC', 'DOORMAN', 'RECEPTIONIST', 'RESIDENT')),
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (profile_id, condominium_id)
);

create index if not exists condo_memberships_condo_idx
  on public.condo_memberships (condominium_id);
create index if not exists condo_memberships_profile_idx
  on public.condo_memberships (profile_id);

-- ------------------------------------------------------------
-- 8. Triggers utilitárias
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger genérico de auditoria. Só registra chamadas autenticadas
-- (auth.uid() <> null) — execuções via seed/CLI não geram ruído.
create or replace function public.audit_trigger_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action  text;
  v_old     jsonb;
  v_new     jsonb;
  v_headers jsonb;
  v_ip      text;
  v_agent   text;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    v_action := 'INSERT';
    v_new := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_action := 'UPDATE';
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
  else
    v_action := 'DELETE';
    v_old := to_jsonb(old);
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
    v_ip := v_headers ->> 'x-forwarded-for';
    v_agent := v_headers ->> 'user-agent';
  exception when others then
    v_ip := null;
    v_agent := null;
  end;

  insert into public.audit_logs (
    user_id, action, entity, entity_id, old_values, new_values, ip_address, user_agent
  ) values (
    auth.uid(), v_action, tg_table_name, coalesce(new.id, old.id),
    v_old, v_new, v_ip, v_agent
  );

  return coalesce(new, old);
end;
$$;

-- Cria o profile automaticamente quando um usuário é criado no auth
create or replace function public.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1),
      'Usuário'
    ),
    new.email,
    'RESIDENT'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.on_auth_user_created();

-- ------------------------------------------------------------
-- 9. Helpers RLS (SECURITY DEFINER evita recursão nas policies)
-- ------------------------------------------------------------
create or replace function public.get_auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role = 'SUPER_ADMIN'
  );
$$;

create or replace function public.has_condominium_access(target_condo uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
      or exists (
        select 1
        from public.condo_memberships m
        where m.profile_id = auth.uid()
          and m.condominium_id = target_condo
          and m.active = true
      );
$$;

-- ------------------------------------------------------------
-- 10. RLS — ativo por padrão
-- ------------------------------------------------------------
alter table public.audit_logs        enable row level security;
alter table public.condominiums      enable row level security;
alter table public.buildings         enable row level security;
alter table public.units             enable row level security;
alter table public.profiles          enable row level security;
alter table public.condo_memberships enable row level security;

-- Profiles -----------------------------------------------------
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

create policy profiles_select_super_admin on public.profiles
  for select using (public.is_super_admin());

create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.get_auth_role());

create policy profiles_update_super_admin on public.profiles
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Condominiums -------------------------------------------------
create policy condominiums_all_super_admin on public.condominiums
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy condominiums_select_member on public.condominiums
  for select using (public.has_condominium_access(id));

-- Buildings ----------------------------------------------------
create policy buildings_all_super_admin on public.buildings
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy buildings_select_member on public.buildings
  for select using (public.has_condominium_access(condominium_id));

-- Units --------------------------------------------------------
create policy units_all_super_admin on public.units
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy units_select_member on public.units
  for select using (public.has_condominium_access(condominium_id));

-- condo_memberships --------------------------------------------
create policy condo_memberships_select_self on public.condo_memberships
  for select using (profile_id = auth.uid());

create policy condo_memberships_all_super_admin on public.condo_memberships
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- audit_logs ---------------------------------------------------
create policy audit_logs_select_super_admin on public.audit_logs
  for select using (public.is_super_admin());

-- ------------------------------------------------------------
-- 11. Triggers nas tabelas (updated_at + auditoria)
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['condominiums', 'buildings', 'units', 'profiles', 'condo_memberships']
  loop
    execute format(
      'drop trigger if exists %I_set_updated_at on public.%I', t, t
    );
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      t, t
    );
    execute format(
      'drop trigger if exists %I_audit on public.%I', t, t
    );
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I
       for each row execute function public.audit_trigger_row()',
      t, t
    );
  end loop;
end;
$$;