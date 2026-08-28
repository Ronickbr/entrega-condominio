-- ============================================================
-- Migration: Add PIN code (4 numeric digits) to residents
-- ============================================================

-- 1. Add pin_code column to residents table with check constraint (4 digits only numeric)
alter table public.residents
  add column if not exists pin_code text check (pin_code ~ '^\d{4}$');

-- 2. Create index on pin_code for quick lookups during package collection
create index if not exists residents_pin_code_idx on public.residents (pin_code);

-- 3. Function for a resident to update their own PIN securely
create or replace function public.update_resident_pin(
  target_resident_id uuid,
  new_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validate PIN format: exactly 4 digits
  if new_pin !~ '^\d{4}$' then
    raise exception 'O PIN deve conter exatamente 4 dígitos numéricos.';
  end if;

  -- Check if the current user is a super admin, the syndic/operator of the condo, or the resident themselves
  if public.is_super_admin() 
     or exists (
       select 1 from public.residents r
       join public.units u on u.id = r.unit_id
       where r.id = target_resident_id
         and public.can_manage_condominium(u.condominium_id)
     )
     or exists (
       select 1 from public.residents r
       where r.id = target_resident_id
         and r.profile_id = auth.uid()
     ) then
    update public.residents
    set pin_code = new_pin,
        updated_at = now()
    where id = target_resident_id;
    return true;
  else
    raise exception 'Permissão negada para alterar este PIN.';
  end if;
end;
$$;

grant execute on function public.update_resident_pin(uuid, text) to authenticated;
