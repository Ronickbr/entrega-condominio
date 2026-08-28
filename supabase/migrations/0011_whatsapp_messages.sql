-- ============================================================
-- 0011_whatsapp_messages.sql
-- Etapa 6 — Mensagens WhatsApp (Evolution API) rastreáveis.
-- RLS: SUPER_ADMIN/SYNDIC do condomínio.
-- ============================================================

-- Status de entrega (rastreável via webhook)
do $$
begin
  create type public.whatsapp_status as enum (
    'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.whatsapp_messages (
  id                   uuid primary key default gen_random_uuid(),
  condominium_id       uuid not null references public.condominiums (id) on delete cascade,
  recipient_id         uuid references public.profiles (id) on delete set null,
  phone                text not null,
  package_id           uuid references public.packages (id) on delete cascade,
  message_type         text not null default 'PACKAGE_RECEIVED'
                       check (message_type in (
                         'PACKAGE_RECEIVED',
                         'PACKAGE_REMINDER',
                         'PACKAGE_COLLECTED'
                       )),
  content              text not null,
  status               public.whatsapp_status not null default 'QUEUED',
  provider_message_id  text,
  attempts             int not null default 0,
  max_attempts         int not null default 3,
  sent_at              timestamptz,
  delivered_at         timestamptz,
  read_at              timestamptz,
  failed_at            timestamptz,
  last_error           text,
  created_at           timestamptz not null default now()
);

create index if not exists whatsapp_messages_condo_idx
  on public.whatsapp_messages (condominium_id, created_at desc);
create index if not exists whatsapp_messages_status_idx
  on public.whatsapp_messages (status);

-- Extende os event_types de package_events p/ entregas do WhatsApp
alter table public.package_events
  drop constraint if exists package_events_event_type_check;

alter table public.package_events
  add constraint package_events_event_type_check
  check (event_type in (
    'PACKAGE_CREATED',
    'PACKAGE_RECEIVED',
    'RESIDENT_MATCHED',
    'WHATSAPP_SENT',
    'WHATSAPP_DELIVERED',
    'WHATSAPP_READ',
    'WHATSAPP_FAILED',
    'REMINDER_SENT',
    'THIRD_PARTY_AUTHORIZED',
    'PACKAGE_COLLECTED',
    'PACKAGE_COLLECTED_BY_THIRD_PARTY',
    'PACKAGE_RETURNED',
    'PACKAGE_CANCELLED'
  ));

-- ------------------------------------------------------------
-- RLS — SUPER_ADMIN/SYNDIC via condomínio
-- ------------------------------------------------------------
alter table public.whatsapp_messages enable row level security;

create policy whatsapp_messages_all_manage on public.whatsapp_messages
  for all
  using (public.can_manage_condominium(condominium_id))
  with check (public.can_manage_condominium(condominium_id));

-- ------------------------------------------------------------
-- RPC: "Reenviar" — volta para a fila (QUEUED)
-- ------------------------------------------------------------
create or replace function public.requeue_whatsapp_message(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_condo uuid;
begin
  select condominium_id into v_condo
  from public.whatsapp_messages
  where id = p_message_id;

  if v_condo is null then
    raise exception 'Mensagem não encontrada';
  end if;

  if not public.can_manage_condominium(v_condo) then
    raise exception 'Sem permissão para reenviar mensagens deste condomínio';
  end if;

  update public.whatsapp_messages
  set status = 'QUEUED',
      attempts = 0,
      last_error = null,
      failed_at = null,
      provider_message_id = null
  where id = p_message_id;

  return true;
end;
$$;
