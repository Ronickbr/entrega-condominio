-- ============================================================
-- 0017_lgpd_data_retention.sql
-- Etapa 10.3 — LGPD: consentimentos + retenção de dados + exclusão
--
-- 1. Enum consent_type + tabela lgpd_consents (1:1 por tipo)
-- 2. Tabela data_exclusion_requests (solicitações GDPR)
-- 3. RPC purge_expired_photos (retenção de fotos)
-- 4. RPC submit_data_exclusion_request (GDPR)
-- 5. Gate de consentimento no enfileiramento WhatsApp
-- ============================================================

-- ------------------------------------------------------------
-- 1. Consentimentos
-- ------------------------------------------------------------
create type public.consent_type as enum (
  'DATA_USAGE',
  'WHATSAPP_NOTIFICATIONS',
  'APP_NOTIFICATIONS',
  'THIRD_PARTY_PHOTO'
);

create table if not exists public.lgpd_consents (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  consent_type public.consent_type not null,
  granted      boolean not null default false,
  granted_at   timestamptz,
  ip           text,
  user_agent   text,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (profile_id, consent_type)
);

create index if not exists lgpd_consents_profile_idx on public.lgpd_consents (profile_id);

alter table public.lgpd_consents enable row level security;

-- Morador gerencia apenas os próprios consentimentos.
create policy lgpd_consents_select_self on public.lgpd_consents
  for select using (profile_id = auth.uid());

create policy lgpd_consents_select_super_admin on public.lgpd_consents
  for select using (public.is_super_admin());

create policy lgpd_consents_insert_self on public.lgpd_consents
  for insert with check (profile_id = auth.uid());

create policy lgpd_consents_update_self on public.lgpd_consents
  for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop trigger if exists lgpd_consents_set_updated_at on public.lgpd_consents;
create trigger lgpd_consents_set_updated_at
  before update on public.lgpd_consents
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. Solicitações de exclusão (GDPR)
-- ------------------------------------------------------------
create table if not exists public.data_exclusion_requests (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'PENDING'
               check (status in ('PENDING', 'PROCESSED', 'REJECTED')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.data_exclusion_requests enable row level security;

create policy data_exclusion_select_self on public.data_exclusion_requests
  for select using (profile_id = auth.uid());

create policy data_exclusion_select_super_admin on public.data_exclusion_requests
  for select using (public.is_super_admin());

-- ------------------------------------------------------------
-- 3. RPC purge_expired_photos(p_condominium_id)
--    Apaga fotos (package_images LABEL/THIRD_PARTY) e objetos do
--    storage acima de system_settings.photo_retention_days dias.
-- ------------------------------------------------------------
create or replace function public.purge_expired_photos(p_condominium_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days  int;
  v_count int := 0;
begin
  if not (
    public.can_manage_condominium(p_condominium_id)
    or public.has_operational_access(p_condominium_id)
  ) then
    raise exception 'Sem permissão para executar a limpeza de fotos';
  end if;

  select coalesce(s.photo_retention_days, 180) into v_days
  from public.system_settings s
  where s.condominium_id = p_condominium_id;

  delete from public.package_images pi
  where pi.image_type in ('LABEL', 'THIRD_PARTY')
    and pi.created_at < now() - (v_days || ' days')::interval
    and exists (
      select 1 from public.packages p
      where p.id = pi.package_id and p.condominium_id = p_condominium_id
    );
  get diagnostics v_count = row_count;

  delete from storage.objects o
  where o.bucket_id in ('package-labels', 'package-images', 'third-party-photos')
    and split_part(o.name, '/', 1) = p_condominium_id::text
    and o.created_at < now() - (v_days || ' days')::interval;

  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- 4. RPC submit_data_exclusion_request(p_profile_id)
--    Morador solicita a própria exclusão (GDPR).
-- ------------------------------------------------------------
create or replace function public.submit_data_exclusion_request(p_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_profile_id then
    raise exception 'Sem permissão para solicitar exclusão';
  end if;

  insert into public.data_exclusion_requests (profile_id)
  values (p_profile_id)
  returning id into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- 5. Gate de consentimento no enfileiramento WhatsApp
--    Se o morador revogou WHATSAPP_NOTIFICATIONS (granted = false),
--    o trigger NÃO enfileira a mensagem (LGPD).
-- ------------------------------------------------------------
create or replace function public.enqueue_whatsapp_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_whatsapp_enabled boolean;
  v_user_id uuid;
  v_phone text;
begin
  if new.resident_id is null then
    return new;
  end if;

  select s.whatsapp_enabled into v_whatsapp_enabled
  from public.system_settings s
  where s.condominium_id = new.condominium_id;

  if v_whatsapp_enabled is not true then
    return new;
  end if;

  select pr.id, pr.phone into v_user_id, v_phone
  from public.residents r
  join public.profiles pr on pr.id = r.profile_id
  where r.id = new.resident_id;

  if v_phone is null or btrim(v_phone) = '' then
    return new;
  end if;

  -- LGPD: consentimento WhatsApp revogado → não enfileira.
  if exists (
    select 1 from public.lgpd_consents c
    where c.profile_id = v_user_id
      and c.consent_type = 'WHATSAPP_NOTIFICATIONS'
      and c.granted = false
  ) then
    return new;
  end if;

  insert into public.whatsapp_messages (
    condominium_id, recipient_id, phone, package_id, message_type, content
  )
  values (
    new.condominium_id,
    v_user_id,
    v_phone,
    new.id,
    'PACKAGE_RECEIVED',
    format(
      'Sua encomenda %s chegou e está aguardando retirada na portaria.',
      new.internal_code
    )
  );

  return new;
end;
$$;

grant execute on function public.purge_expired_photos(uuid) to authenticated;
grant execute on function public.submit_data_exclusion_request(uuid) to authenticated;