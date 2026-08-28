-- ============================================================
-- 0003_cadastros_residents_staff.sql
-- Etapa 3 — Cadastros: Moradores e Funcionários + RLS por perfil
--
-- Novas tabelas: residents, staff
-- Novos helpers RLS:
--   get_my_condominium_id, get_my_unit_ids,
--   can_manage_condominium (SYNDIC/SUPER_ADMIN), has_operational_access
-- Ajuste de policies de condominiums/buildings/units para as
-- regras da Etapa 3 (morador não lê buildings diretamente; lê
-- apenas suas units; operacionais e síndico leem o condomínio).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Moradores
-- ------------------------------------------------------------
create table if not exists public.residents (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  unit_id     uuid not null references public.units (id) on delete cascade,
  is_primary  boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (profile_id, unit_id)
);

create index if not exists residents_profile_idx on public.residents (profile_id);
create index if not exists residents_unit_idx on public.residents (unit_id);

-- ------------------------------------------------------------
-- 2. Funcionários (síndico, porteiro, recepção, gestor)
-- ------------------------------------------------------------
create table if not exists public.staff (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  condominium_id  uuid not null references public.condominiums (id) on delete cascade,
  position        text not null
                  check (position in ('SYNDIC', 'DOORMAN', 'RECEPTIONIST', 'MANAGER')),
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (profile_id, condominium_id)
);

create index if not exists staff_condo_idx on public.staff (condominium_id);
create index if not exists staff_profile_idx on public.staff (profile_id);

-- ------------------------------------------------------------
-- 3. Helpers RLS da Etapa 3
-- ------------------------------------------------------------
create or replace function public.get_my_condominium_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.condominium_id
  from public.condo_memberships m
  where m.profile_id = auth.uid()
    and m.active = true
  limit 1;
$$;

create or replace function public.get_my_unit_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(m.unit_id), '{}'::uuid[])
  from public.condo_memberships m
  where m.profile_id = auth.uid()
    and m.active = true
    and m.unit_id is not null;
$$;

-- Pode gerir o condomínio (inserir/editar/excluir cadastros):
-- SUPER_ADMIN global ou membro com papel SYNDIC no condomínio.
create or replace function public.can_manage_condominium(target_condo uuid)
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
          and m.role = 'SYNDIC'
      );
$$;

-- Acesso operacional (leitura de cadastros): SUPER_ADMIN global
-- ou membro com papel SYNDIC/DOORMAN/RECEPTIONIST no condomínio.
create or replace function public.has_operational_access(target_condo uuid)
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
          and m.role in ('SYNDIC', 'DOORMAN', 'RECEPTIONIST')
      );
$$;

-- ------------------------------------------------------------
-- 4. RLS — residents
-- ------------------------------------------------------------
alter table public.residents enable row level security;

create policy residents_all_super_admin on public.residents
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy residents_manage_syndic on public.residents
  for all
  using (
    exists (
      select 1 from public.units u
      where u.id = residents.unit_id
        and public.can_manage_condominium(u.condominium_id)
    )
  )
  with check (
    exists (
      select 1 from public.units u
      where u.id = residents.unit_id
        and public.can_manage_condominium(u.condominium_id)
    )
  );

create policy residents_select_operational on public.residents
  for select
  using (
    exists (
      select 1 from public.units u
      where u.id = residents.unit_id
        and public.has_operational_access(u.condominium_id)
    )
  );

-- Morador vê o próprio registro e os da sua unidade (coabitantes)
create policy residents_select_resident_own_unit on public.residents
  for select using (unit_id = any (public.get_my_unit_ids()));

-- ------------------------------------------------------------
-- 5. RLS — staff
-- ------------------------------------------------------------
alter table public.staff enable row level security;

create policy staff_all_super_admin on public.staff
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy staff_manage_syndic on public.staff
  for all
  using (public.can_manage_condominium(condominium_id))
  with check (public.can_manage_condominium(condominium_id));

create policy staff_select_operational_or_self on public.staff
  for select
  using (
    profile_id = auth.uid()
    or public.has_operational_access(condominium_id)
  );

-- ------------------------------------------------------------
-- 6. Ajuste de policies das tabelas da Etapa 2
-- ------------------------------------------------------------
-- Buildings: síndico gerencia; operacionais leem; morador NÃO lê.
drop policy if exists buildings_select_member on public.buildings;

create policy buildings_manage_syndic on public.buildings
  for all
  using (public.can_manage_condominium(condominium_id))
  with check (public.can_manage_condominium(condominium_id));

create policy buildings_select_operational on public.buildings
  for select using (public.has_operational_access(condominium_id));

-- Units: síndico gerencia; operacionais leem; morador lê as suas.
drop policy if exists units_select_member on public.units;

create policy units_manage_syndic on public.units
  for all
  using (public.can_manage_condominium(condominium_id))
  with check (public.can_manage_condominium(condominium_id));

create policy units_select_operational_or_resident on public.units
  for select
  using (
    public.has_operational_access(condominium_id)
    or id = any (public.get_my_unit_ids())
  );

-- Profiles: membros do mesmo condomínio podem listar perfis
-- (necessário para vincular moradores/funcionários no cadastro).
-- O helper é SECURITY DEFINER para não ser limitado pelo RLS de
-- condo_memberships (senão o subquery veria só os próprios vínculos).
create or replace function public.get_condo_member_profile_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct m.profile_id), '{}'::uuid[])
  from public.condo_memberships m
  where m.active = true
    and public.has_condominium_access(m.condominium_id);
$$;

drop policy if exists profiles_select_condo_members on public.profiles;
create policy profiles_select_condo_members on public.profiles
  for select using (id = any (public.get_condo_member_profile_ids()));

-- ------------------------------------------------------------
-- 7. Triggers (updated_at + auditoria) nas novas tabelas
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['residents', 'staff']
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