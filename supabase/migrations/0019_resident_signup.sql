-- ============================================================
-- 0019_resident_signup.sql
-- Cadastro de morador direto na página de login + co-moradores.
--
-- 1. Tabela household_members (co-moradores SEM login — só nome/telefone)
-- 2. RPC get_signup_buildings (anon — opções de bloco p/ o formulário)
-- 3. RPC register_primary_resident (auth — vincula morador principal)
-- 4. RPC add_household_member (auth — adiciona co-morador do apto)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Co-moradores (sem login)
-- ------------------------------------------------------------
create table if not exists public.household_members (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid not null references public.units (id) on delete cascade,
  full_name  text not null,
  phone      text,
  added_by   uuid references public.profiles (id) on delete set null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists household_members_unit_idx
  on public.household_members (unit_id);

alter table public.household_members enable row level security;

create policy household_select on public.household_members
  for select
  using (
    unit_id = any (public.get_my_unit_ids())
    or exists (
      select 1 from public.units u
      where u.id = household_members.unit_id
        and public.has_operational_access(u.condominium_id)
    )
  );

create policy household_insert_own_unit on public.household_members
  for insert
  with check (
    unit_id = any (public.get_my_unit_ids())
    and added_by = auth.uid()
  );

create policy household_update_own_unit on public.household_members
  for update
  using (
    unit_id = any (public.get_my_unit_ids())
    or exists (
      select 1 from public.units u
      where u.id = household_members.unit_id
        and public.can_manage_condominium(u.condominium_id)
    )
  );

drop trigger if exists household_members_set_updated_at on public.household_members;
create trigger household_members_set_updated_at
  before update on public.household_members
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. Opções de bloco para o formulário de cadastro (anon)
-- ------------------------------------------------------------
create or replace function public.get_signup_buildings()
returns table (
  condominium_id   uuid,
  condominium_name text,
  building_id      uuid,
  building_name    text
)
language sql
security definer
set search_path = public
as $$
  select c.id, c.name, b.id, b.name
  from public.condominiums c
  join public.buildings b on b.condominium_id = c.id
  where c.active and b.active
  order by c.name, b.name;
$$;

grant execute on function public.get_signup_buildings() to anon, authenticated;

-- ------------------------------------------------------------
-- 3. Cadastro do morador principal (auth)
-- ------------------------------------------------------------
create or replace function public.register_primary_resident(
  p_building_id uuid,
  p_unit_number text,
  p_full_name   text,
  p_phone       text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_condo    uuid;
  v_unit     uuid;
  v_resident uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if nullif(btrim(p_full_name), '') is null then
    raise exception 'Informe o nome completo';
  end if;

  select condominium_id into v_condo
  from public.buildings
  where id = p_building_id and active;

  if v_condo is null then
    raise exception 'Bloco inválido';
  end if;

  select id into v_unit
  from public.units
  where condominium_id = v_condo
    and building_id = p_building_id
    and number = btrim(p_unit_number)
    and active;

  if v_unit is null then
    insert into public.units (condominium_id, building_id, number)
    values (v_condo, p_building_id, btrim(p_unit_number))
    returning id into v_unit;
  end if;

  update public.profiles
     set full_name = btrim(p_full_name),
         phone = nullif(btrim(p_phone), '')
   where id = auth.uid();

  insert into public.condo_memberships (profile_id, condominium_id, unit_id, role)
  values (auth.uid(), v_condo, v_unit, 'RESIDENT')
  on conflict (profile_id, condominium_id)
    do update set unit_id = excluded.unit_id, active = true;

  insert into public.residents (profile_id, unit_id, is_primary)
  values (auth.uid(), v_unit, true)
  on conflict (profile_id, unit_id)
    do update set active = true, is_primary = true
  returning id into v_resident;

  return v_resident;
end;
$$;

grant execute on function public.register_primary_resident(uuid, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 4. Adicionar co-morador do próprio apartamento (auth)
-- ------------------------------------------------------------
create or replace function public.add_household_member(
  p_unit_id   uuid,
  p_full_name text,
  p_phone     text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if nullif(btrim(p_full_name), '') is null then
    raise exception 'Informe o nome do morador';
  end if;

  if not (p_unit_id = any (public.get_my_unit_ids())) then
    raise exception 'Sem permissão para este apartamento';
  end if;

  insert into public.household_members (unit_id, full_name, phone, added_by)
  values (p_unit_id, btrim(p_full_name), nullif(btrim(p_phone), ''), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_household_member(uuid, text, text) to authenticated;