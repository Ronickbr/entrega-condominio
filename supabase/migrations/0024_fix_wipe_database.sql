-- ============================================================
-- Migration: Fix wipe_database DELETE syntax (requires WHERE clause)
-- ============================================================

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

  -- Use true in WHERE clause to satisfy Postgres safety check for DELETE without WHERE
  delete from public.package_events where true;
  delete from public.packages where true;
  delete from public.third_party_authorizations where true;
  delete from public.notifications where true;
  delete from public.whatsapp_logs where true;
  delete from public.residents where true;
  delete from public.staff where true;
  delete from public.units where true;
  delete from public.buildings where true;
  delete from public.condo_memberships where true;
  delete from public.condominiums where true;

  return true;
end;
$$;

grant execute on function public.wipe_database() to authenticated;
