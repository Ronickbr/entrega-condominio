-- ============================================================
-- 0012_system_settings.sql
-- Etapa 6 — Configurações por condomínio.
-- RLS: admin/síndico gerencia; portaria lê.
-- ============================================================

create table if not exists public.system_settings (
  id                  uuid primary key default gen_random_uuid(),
  condominium_id      uuid not null unique references public.condominiums (id) on delete cascade,
  whatsapp_enabled    boolean not null default false,
  reminders_enabled   boolean not null default true,
  reminder_24h        boolean not null default true,
  reminder_48h        boolean not null default true,
  reminder_72h        boolean not null default true,
  photo_retention_days int not null default 180
                       check (photo_retention_days between 1 and 3650),
  updated_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.system_settings enable row level security;

create policy system_settings_all_manage on public.system_settings
  for all
  using (public.can_manage_condominium(condominium_id))
  with check (public.can_manage_condominium(condominium_id));

create policy system_settings_select_operational on public.system_settings
  for select using (public.has_operational_access(condominium_id));

-- ------------------------------------------------------------
-- Seed demo (condomínio C1): WhatsApp habilitado p/ demonstrar a
-- fila; sem EVOLUTION_API_* configurado as mensagens ficam QUEUED.
-- ------------------------------------------------------------
insert into public.system_settings (condominium_id, whatsapp_enabled)
values ('11111111-1111-1111-1111-111111111111', true)
on conflict (condominium_id) do nothing;

drop trigger if exists system_settings_set_updated_at on public.system_settings;
create trigger system_settings_set_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();
