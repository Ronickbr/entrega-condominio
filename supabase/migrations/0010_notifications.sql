-- ============================================================
-- 0010_notifications.sql
-- Etapa 6 — Central interna de notificações.
-- RLS: cada usuário enxerga/gerencia SOMENTE as próprias.
-- Realtime habilitado para disparar o bell no frontend.
-- ============================================================

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  type         text not null default 'SYSTEM'
               check (type in (
                 'PACKAGE_RECEIVED',
                 'PACKAGE_REMINDER',
                 'PACKAGE_COLLECTED',
                 'AUTHORIZATION_CREATED',
                 'AUTHORIZATION_USED',
                 'SYSTEM',
                 'ERROR'
               )),
  title        text not null,
  message      text not null,
  reference_id uuid,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, read_at, created_at desc);

-- ------------------------------------------------------------
-- RLS — user_id = auth.uid() SOMENTE
-- ------------------------------------------------------------
alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());

create policy notifications_insert_own on public.notifications
  for insert with check (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------
-- Realtime (bell em tempo real)
-- ------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end;
$$;

-- ------------------------------------------------------------
-- Trigger: notificação PACKAGE_RECEIVED ao morador
-- ------------------------------------------------------------
create or replace function public.notify_package_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_unit_label text;
begin
  if new.resident_id is null then
    return new;
  end if;

  select r.profile_id
  into v_user_id
  from public.residents r
  where r.id = new.resident_id;

  if v_user_id is null then
    return new;
  end if;

  select coalesce(
    (select b.name || ' ' || u.number from public.units u
       left join public.buildings b on b.id = u.building_id
      where u.id = new.unit_id),
    'na portaria'
  ) into v_unit_label;

  insert into public.notifications (user_id, type, title, message, reference_id)
  values (
    v_user_id,
    'PACKAGE_RECEIVED',
    'Encomenda recebida na portaria',
    format(
      'Sua encomenda %s chegou e está aguardando retirada na portaria (%s).',
      coalesce(new.internal_code, ''),
      v_unit_label
    ),
    new.id
  );

  return new;
end;
$$;

drop trigger if exists notify_package_received on public.packages;
create trigger notify_package_received
  after insert on public.packages
  for each row execute function public.notify_package_received();

-- ------------------------------------------------------------
-- Backfill: notificações das encomendas já existentes (seed)
-- ------------------------------------------------------------
insert into public.notifications (user_id, type, title, message, reference_id)
select
  r.profile_id,
  'PACKAGE_RECEIVED',
  'Encomenda recebida na portaria',
  format('Sua encomenda %s chegou e está aguardando retirada na portaria.', p.internal_code),
  p.id
from public.packages p
join public.residents r on r.id = p.resident_id
where not exists (
  select 1 from public.notifications n
  where n.reference_id = p.id and n.type = 'PACKAGE_RECEIVED'
);
