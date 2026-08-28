-- ============================================================
-- 0013_reminders.sql
-- Etapa 6 — Lembretes 24/48/72h + fila WhatsApp.
--
-- 1. Trigger: ao receber encomenda, enfileira mensagem WhatsApp
--    (somente se settings.whatsapp_enabled e morador tem telefone).
-- 2. RPC run_reminder_scan: varre encomendas pendentes além dos
--    thresholds habilitados SEM evento REMINDER_SENT (idempotente),
--    cria evento + notificação + enfileira WhatsApp.
-- 3. Backfill demo da fila WhatsApp das encomendas pendentes seed.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Trigger de enfileiramento WhatsApp no recebimento
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

drop trigger if exists enqueue_whatsapp_received on public.packages;
create trigger enqueue_whatsapp_received
  after insert on public.packages
  for each row execute function public.enqueue_whatsapp_received();

-- ------------------------------------------------------------
-- 2. RPC run_reminder_scan (idempotente por evento REMINDER_SENT)
-- ------------------------------------------------------------
create or replace function public.run_reminder_scan(p_condominium_id uuid default null)
returns table (
  package_id      uuid,
  internal_code   text,
  threshold_hours int,
  action          text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings record;
  v_pkg record;
  v_threshold int;
  v_thresholds int[] := array[24, 48, 72];
  v_enabled boolean;
  v_user_id uuid;
  v_phone text;
  v_condo_ids uuid[];
begin
  -- Condomínios acessíveis ao chamador (admin/síndico ou portaria).
  -- Sem nenhum → nega (evita morador acionar lembretes de terceiros).
  select coalesce(array_agg(x.id), '{}'::uuid[]) into v_condo_ids
  from (
    select s.condominium_id as id
    from public.system_settings s
    where (p_condominium_id is null or s.condominium_id = p_condominium_id)
      and s.reminders_enabled
      and (
        public.can_manage_condominium(s.condominium_id)
        or public.has_operational_access(s.condominium_id)
      )
  ) x;

  if coalesce(array_length(v_condo_ids, 1), 0) = 0 then
    raise exception 'Sem permissão para executar a varredura de lembretes';
  end if;

  for v_settings in
    select s.*
    from public.system_settings s
    where s.condominium_id = any (v_condo_ids)
      and s.reminders_enabled
  loop
    foreach v_threshold in array v_thresholds loop
      v_enabled := case v_threshold
        when 24 then v_settings.reminder_24h
        when 48 then v_settings.reminder_48h
        when 72 then v_settings.reminder_72h
        else false
      end;

      if not v_enabled then
        continue;
      end if;

      for v_pkg in
        select p.id, p.internal_code, p.resident_id, p.received_at
        from public.packages p
        where p.condominium_id = v_settings.condominium_id
          and p.status in ('AGUARDANDO_RETIRADA', 'NAO_IDENTIFICADA')
          and p.active = true
          and p.received_at <= now() - (v_threshold || ' hours')::interval
          and not exists (
            select 1 from public.package_events e
            where e.package_id = p.id
              and e.event_type = 'REMINDER_SENT'
              and e.payload ->> 'threshold_hours' = v_threshold::text
          )
      loop
        insert into public.package_events (package_id, event_type, payload)
        values (
          v_pkg.id,
          'REMINDER_SENT',
          jsonb_build_object('threshold_hours', v_threshold)
        );

        if v_pkg.resident_id is not null then
          select r.profile_id into v_user_id
          from public.residents r
          where r.id = v_pkg.resident_id;

          if v_user_id is not null then
            insert into public.notifications (user_id, type, title, message, reference_id)
            values (
              v_user_id,
              'PACKAGE_REMINDER',
              format('Ainda não retirou sua encomenda (%sh)', v_threshold),
              format(
                'Sua encomenda %s segue aguardando retirada na portaria há mais de %s horas.',
                v_pkg.internal_code, v_threshold
              ),
              v_pkg.id
            );
          end if;

          if v_settings.whatsapp_enabled then
            select pr.id, pr.phone into v_user_id, v_phone
            from public.residents r
            join public.profiles pr on pr.id = r.profile_id
            where r.id = v_pkg.resident_id;

            if v_phone is not null and btrim(v_phone) <> '' then
              insert into public.whatsapp_messages (
                condominium_id, recipient_id, phone, package_id, message_type, content
              )
              values (
                v_settings.condominium_id,
                v_user_id,
                v_phone,
                v_pkg.id,
                'PACKAGE_REMINDER',
                format(
                  'Lembrete: sua encomenda %s aguarda retirada há mais de %s horas.',
                  v_pkg.internal_code, v_threshold
                )
              );
            end if;
          end if;
        end if;

        return query
          select v_pkg.id, v_pkg.internal_code, v_threshold, 'REMINDER_CREATED';
      end loop;
    end loop;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 3. Backfill demo: fila WhatsApp das encomendas pendentes seed
--    (respecta settings.whatsapp_enabled + morador com telefone)
-- ------------------------------------------------------------
insert into public.whatsapp_messages (
  condominium_id, recipient_id, phone, package_id, message_type, content
)
select
  p.condominium_id,
  pr.id,
  pr.phone,
  p.id,
  'PACKAGE_RECEIVED',
  format('Sua encomenda %s chegou e está aguardando retirada na portaria.', p.internal_code)
from public.packages p
join public.residents r on r.id = p.resident_id
join public.profiles pr on pr.id = r.profile_id
where p.status = 'AGUARDANDO_RETIRADA'
  and p.active = true
  and pr.phone is not null
  and exists (
    select 1 from public.system_settings s
    where s.condominium_id = p.condominium_id and s.whatsapp_enabled
  );
