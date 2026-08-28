-- ============================================================
-- 0006_packages.sql
-- Etapa 4 — Recebimento: cadastro manual + foto + pendências
--
-- Novo enum: package_status
-- Novas tabelas: packages, package_images, package_events
-- Trigger: package_on_created (eventos PACKAGE_CREATED + PACKAGE_RECEIVED)
-- Helpers RLS: get_my_resident_ids
-- RLS completa por perfil (admin/síndico, operacional, morador).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enum de status da encomenda
-- ------------------------------------------------------------
create type public.package_status as enum (
  'RECEBIDA',
  'AGUARDANDO_RETIRADA',
  'RETIRADA',
  'RETIRADA_POR_TERCEIRO',
  'NAO_IDENTIFICADA',
  'DEVOLVIDA',
  'CANCELADA'
);

-- ------------------------------------------------------------
-- 2. Encomendas
-- ------------------------------------------------------------
create table if not exists public.packages (
  id                 uuid primary key default gen_random_uuid(),
  internal_code      text not null unique
                     default ('ENC-' || to_char(now(), 'YYYYMMDD') || '-' ||
                              upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  condominium_id     uuid not null references public.condominiums (id) on delete cascade,
  unit_id            uuid references public.units (id) on delete set null,
  resident_id        uuid references public.residents (id) on delete set null,
  recipient_name_raw text,
  carrier            text,
  tracking_code      text,
  notes              text,
  status             public.package_status not null default 'AGUARDANDO_RETIRADA',
  received_by        uuid references public.profiles (id) on delete set null,
  received_at        timestamptz not null default now(),
  collected_by       uuid references public.profiles (id) on delete set null,
  collected_at       timestamptz,
  collection_type    text
                     check (collection_type in ('RESIDENT', 'THIRD_PARTY')),
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists packages_condo_status_idx
  on public.packages (condominium_id, status);
create index if not exists packages_resident_idx
  on public.packages (resident_id);
create index if not exists packages_received_at_idx
  on public.packages (received_at desc);
create index if not exists packages_unit_idx
  on public.packages (unit_id);

-- ------------------------------------------------------------
-- 3. Imagens da encomenda
-- ------------------------------------------------------------
create table if not exists public.package_images (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.packages (id) on delete cascade,
  storage_path  text not null,
  image_type    text not null
                check (image_type in ('LABEL', 'PACKAGE', 'THIRD_PARTY', 'OTHER')),
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists package_images_package_idx
  on public.package_images (package_id);

-- ------------------------------------------------------------
-- 4. Eventos / timeline da encomenda
-- ------------------------------------------------------------
create table if not exists public.package_events (
  id         uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages (id) on delete cascade,
  event_type text not null
             check (event_type in (
               'PACKAGE_CREATED',
               'PACKAGE_RECEIVED',
               'RESIDENT_MATCHED',
               'WHATSAPP_SENT',
               'WHATSAPP_FAILED',
               'REMINDER_SENT',
               'THIRD_PARTY_AUTHORIZED',
               'PACKAGE_COLLECTED',
               'PACKAGE_COLLECTED_BY_THIRD_PARTY',
               'PACKAGE_RETURNED',
               'PACKAGE_CANCELLED'
             )),
  payload    jsonb not null default '{}'::jsonb,
  user_id    uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists package_events_package_idx
  on public.package_events (package_id, created_at);

-- ------------------------------------------------------------
-- 5. Trigger: eventos na criação da encomenda
-- ------------------------------------------------------------
create or replace function public.package_on_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.package_events (package_id, event_type, payload, user_id)
  values
    (
      new.id,
      'PACKAGE_CREATED',
      jsonb_build_object('internal_code', new.internal_code),
      new.received_by
    ),
    (
      new.id,
      'PACKAGE_RECEIVED',
      jsonb_build_object('received_at', new.received_at),
      new.received_by
    );
  return new;
end;
$$;

drop trigger if exists package_on_created on public.packages;
create trigger package_on_created
  after insert on public.packages
  for each row execute function public.package_on_created();

-- ------------------------------------------------------------
-- 6. Helper RLS: ids dos residentes do usuário logado
-- ------------------------------------------------------------
create or replace function public.get_my_resident_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(r.id), '{}'::uuid[])
  from public.residents r
  where r.profile_id = auth.uid()
    and r.active = true;
$$;

-- ------------------------------------------------------------
-- 7. RLS — packages
-- ------------------------------------------------------------
alter table public.packages enable row level security;

-- Admin/Síndico: tudo no seu condomínio
create policy packages_all_manage on public.packages
  for all
  using (public.can_manage_condominium(condominium_id))
  with check (public.can_manage_condominium(condominium_id));

-- Operacionais (porteiro/recepção): leitura
create policy packages_select_operational on public.packages
  for select using (public.has_operational_access(condominium_id));

-- Inserção pela portaria: recebido_por = quem cadastra
create policy packages_insert_operational on public.packages
  for insert
  with check (
    public.has_operational_access(condominium_id)
    and received_by = auth.uid()
  );

-- Morador: apenas as próprias encomendas
create policy packages_select_resident on public.packages
  for select using (resident_id = any (public.get_my_resident_ids()));

-- ------------------------------------------------------------
-- 8. RLS — package_images
-- ------------------------------------------------------------
alter table public.package_images enable row level security;

create policy package_images_all_manage on public.package_images
  for all
  using (
    exists (
      select 1 from public.packages p
      where p.id = package_images.package_id
        and public.can_manage_condominium(p.condominium_id)
    )
  )
  with check (
    exists (
      select 1 from public.packages p
      where p.id = package_images.package_id
        and public.has_operational_access(p.condominium_id)
    )
  );

create policy package_images_select_operational on public.package_images
  for select
  using (
    exists (
      select 1 from public.packages p
      where p.id = package_images.package_id
        and public.has_operational_access(p.condominium_id)
    )
  );

create policy package_images_select_resident on public.package_images
  for select
  using (
    exists (
      select 1 from public.packages p
      where p.id = package_images.package_id
        and p.resident_id = any (public.get_my_resident_ids())
    )
  );

-- ------------------------------------------------------------
-- 9. RLS — package_events
-- ------------------------------------------------------------
alter table public.package_events enable row level security;

create policy package_events_select_manage on public.package_events
  for select
  using (
    exists (
      select 1 from public.packages p
      where p.id = package_events.package_id
        and public.can_manage_condominium(p.condominium_id)
    )
  );

create policy package_events_select_operational on public.package_events
  for select
  using (
    exists (
      select 1 from public.packages p
      where p.id = package_events.package_id
        and public.has_operational_access(p.condominium_id)
    )
  );

create policy package_events_select_resident on public.package_events
  for select
  using (
    exists (
      select 1 from public.packages p
      where p.id = package_events.package_id
        and p.resident_id = any (public.get_my_resident_ids())
    )
  );

-- ------------------------------------------------------------
-- 10. Triggers utilitárias (updated_at + auditoria)
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['packages', 'package_images', 'package_events']
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