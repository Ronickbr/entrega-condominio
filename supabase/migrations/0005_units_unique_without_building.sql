-- ============================================================
-- 0005_units_unique_without_building.sql
-- Etapa 3 — Correção: unidade sem bloco não pode duplicar número
--
-- A UNIQUE (condominium_id, building_id, number) não cobre
-- unidades cadastradas SEM bloco (NULLs são distintos em UNIQUE).
-- Este índice parcial impede duas unidades sem bloco com o mesmo
-- número no mesmo condomínio, fechando o critério de pronto:
--   "SUPER_ADMIN cria unidade sem bloco → unique(condo, null, number)"
-- ============================================================

create unique index if not exists units_condo_number_without_building_key
  on public.units (condominium_id, number)
  where building_id is null;