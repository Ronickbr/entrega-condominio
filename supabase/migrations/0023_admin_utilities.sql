-- ============================================================
-- Migration: Admin Utilities (Wipe Database & Seed Mockup Data)
-- ============================================================

-- 1. Function to wipe all application data (keeps system structures / profiles if needed or clears everything transactional)
create or replace function public.wipe_database()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Apenas o Administrador do Sistema pode limpar o banco de dados.';
  end if;

  -- Delete transactional and operational data in correct order to respect FKs
  delete from public.package_events;
  delete from public.packages;
  delete from public.third_party_authorizations;
  delete from public.notifications;
  delete from public.whatsapp_logs;
  delete from public.residents;
  delete from public.staff;
  delete from public.units;
  delete from public.buildings;
  delete from public.condo_memberships;
  delete from public.condominiums;

  return true;
end;
$$;

-- 2. Function to seed demo/mockup data
create or replace function public.seed_mockup_data()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_condo_id uuid := '11111111-1111-1111-1111-111111111111';
  v_bldg_a uuid := '22222222-2222-2222-2222-111111111111';
  v_bldg_b uuid := '22222222-2222-2222-2222-222222222222';
  v_unit_101 uuid := '33333333-3333-3333-3333-333333333001';
  v_unit_102 uuid := '33333333-3333-3333-3333-333333333002';
  v_unit_201 uuid := '33333333-3333-3333-3333-444444444002';
begin
  if not public.is_super_admin() then
    raise exception 'Apenas o Administrador do Sistema pode gerar dados de mockup.';
  end if;

  -- Ensure Condominium
  insert into public.condominiums (id, name, cnpj, address, active)
  values (v_condo_id, 'Condomínio Grand Park Demo', '12.345.678/0001-99', '{"street": "Av. Paulista", "number": "1000", "city": "São Paulo", "state": "SP"}', true)
  on conflict (id) do nothing;

  -- Ensure Buildings
  insert into public.buildings (id, condominium_id, name, identifier, active)
  values 
    (v_bldg_a, v_condo_id, 'Torre Norte', 'Norte', true),
    (v_bldg_b, v_condo_id, 'Torre Sul', 'Sul', true)
  on conflict (id) do nothing;

  -- Ensure Units
  insert into public.units (id, condominium_id, building_id, number, floor, active)
  values
    (v_unit_101, v_condo_id, v_bldg_a, '101', '1', true),
    (v_unit_102, v_condo_id, v_bldg_a, '102', '1', true),
    (v_unit_201, v_condo_id, v_bldg_b, '201', '2', true)
  on conflict (id) do nothing;

  -- Ensure Mockup Packages
  insert into public.packages (id, condominium_id, building_id, unit_id, internal_code, tracking_code, carrier, status, recipient_name_raw, active)
  values
    ('55555555-5555-5555-5555-555555555001', v_condo_id, v_bldg_a, v_unit_101, 'ENC-2026-001', 'BR123456789BR', 'Correios', 'AGUARDANDO_RETIRADA', 'Ana Souza', true),
    ('55555555-5555-5555-5555-555555555002', v_condo_id, v_bldg_a, v_unit_102, 'ENC-2026-002', 'AMZ987654321US', 'Amazon', 'AGUARDANDO_RETIRADA', 'Bruno Lima', true),
    ('55555555-5555-5555-5555-555555555003', v_condo_id, v_bldg_b, v_unit_201, 'ENC-2026-003', 'ML555444333BR', 'Mercado Livre', 'RETIRADA', 'Carla Mendes', true)
  on conflict (id) do nothing;

  return true;
end;
$$;

grant execute on function public.wipe_database() to authenticated;
grant execute on function public.seed_mockup_data() to authenticated;
