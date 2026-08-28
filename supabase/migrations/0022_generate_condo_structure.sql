-- ============================================================
-- Migration: Add wizard procedure for automatic building and unit generation
-- ============================================================

create or replace function public.generate_condo_structure(
  p_condominium_id uuid,
  p_towers_count int,
  p_floors_count int,
  p_units_per_floor int,
  p_tower_prefix text default 'Torre',
  p_numbering_type text default 'FLOOR_SUFFIX' -- 'FLOOR_SUFFIX' (101, 102...) or 'SEQUENTIAL' (1, 2...)
)
returns table (success boolean, message text, created_buildings int, created_units int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_building_id uuid;
  v_b_idx int;
  v_f_idx int;
  v_u_idx int;
  v_unit_num text;
  v_total_buildings int := 0;
  v_total_units int := 0;
begin
  if not public.can_manage_condominium(p_condominium_id) then
    raise exception 'Sem permissão para gerar estrutura neste condomínio.';
  end if;

  if p_towers_count < 1 or p_floors_count < 1 or p_units_per_floor < 1 then
    return query select false, 'Parâmetros de geração inválidos.', 0, 0;
    return;
  end if;

  for v_b_idx in 1..p_towers_count loop
    -- Create building/tower
    insert into public.buildings (condominium_id, name, identifier, active)
    values (
      p_condominium_id,
      p_tower_prefix || ' ' || v_b_idx,
      v_b_idx::text,
      true
    )
    returning id into v_building_id;

    v_total_buildings := v_total_buildings + 1;

    for v_f_idx in 1..p_floors_count loop
      for v_u_idx in 1..p_units_per_floor loop
        if p_numbering_type = 'FLOOR_SUFFIX' then
          -- e.g. Floor 1, unit 1 -> 101, floor 2, unit 3 -> 203
          v_unit_num := v_f_idx::text || lpad(v_u_idx::text, 2, '0');
        else
          -- Sequential
          v_unit_num := (((v_f_idx - 1) * p_units_per_floor) + v_u_idx)::text;
        end if;

        insert into public.units (building_id, number, floor, active)
        values (v_building_id, v_unit_num, v_f_idx, true)
        on conflict (building_id, number) do nothing;

        v_total_units := v_total_units + 1;
      end loop;
    end loop;
  end loop;

  return query select true, 'Estrutura gerada com sucesso!', v_total_buildings, v_total_units;
end;
$$;

grant execute on function public.generate_condo_structure(uuid, int, int, int, text, text) to authenticated;
