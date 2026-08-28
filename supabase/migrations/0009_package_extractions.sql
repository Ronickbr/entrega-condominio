-- ============================================================
-- 0009_package_extractions.sql
-- Etapa 5 — OCR: extrações da etiqueta + matching
--
-- Tabela package_extractions: resultado bruto (raw_result SEMPRE
-- salvo, mesmo em extrações falhas), campos detectados e confiança
-- por campo. provider = google_vision (ou mock em dev).
--
-- Divergência da spec: adicionada coluna condominium_id (não listada
-- na spec) para permitir RLS por condomínio, no mesmo padrão das
-- demais tabelas.
-- ============================================================

create table if not exists public.package_extractions (
  id              uuid primary key default gen_random_uuid(),
  condominium_id  uuid not null references public.condominiums (id) on delete cascade,
  package_id      uuid references public.packages (id) on delete set null,
  raw_result      jsonb not null default '{}'::jsonb,
  recipient_name  text,
  unit_number     text,
  building_name   text,
  cpf             text,
  phone           text,
  carrier         text,
  tracking_code   text,
  barcode         text,
  qr_code         text,
  confidence      jsonb not null default '{}'::jsonb,
  provider        text not null default 'google_vision'
                  check (provider in ('google_vision', 'mock')),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists package_extractions_condo_idx
  on public.package_extractions (condominium_id, created_at desc);
create index if not exists package_extractions_package_idx
  on public.package_extractions (package_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.package_extractions enable row level security;

-- Admin/Síndico: tudo no seu condomínio
create policy package_extractions_all_manage on public.package_extractions
  for all
  using (public.can_manage_condominium(condominium_id))
  with check (public.can_manage_condominium(condominium_id));

-- Portaria: insere e lê extrações do seu condomínio
create policy package_extractions_insert_operational on public.package_extractions
  for insert
  with check (
    public.has_operational_access(condominium_id)
    and created_by = auth.uid()
  );

create policy package_extractions_select_operational on public.package_extractions
  for select using (public.has_operational_access(condominium_id));

-- Morador: extrações de encomendas suas (quando vinculadas a um pacote)
create policy package_extractions_select_resident on public.package_extractions
  for select
  using (
    package_id is not null
    and exists (
      select 1 from public.packages p
      where p.id = package_extractions.package_id
        and p.resident_id = any (public.get_my_resident_ids())
    )
  );

-- ------------------------------------------------------------
-- Trigger de auditoria
-- ------------------------------------------------------------
drop trigger if exists package_extractions_audit on public.package_extractions;
create trigger package_extractions_audit
  after insert or update or delete on public.package_extractions
  for each row execute function public.audit_trigger_row();