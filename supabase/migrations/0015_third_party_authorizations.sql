-- Etapa 8 — Terceiro Autorizado: autorizações temporárias + foto + validade
-- Cria enum authorization_status + tabela third_party_authorizations com RLS
-- (morador só as suas; operacionais leitura + mark USED via RPC no condomínio)
-- e estende confirm_package_collection para o fluxo THIRD_PARTY:
--   valida autorização (ACTIVE, dentro da validade, pacote/residente compatível),
--   atualiza pacote E autorização DENTRO DA MESMA TRANSAÇÃO (atomicidade),
--   grava foto do terceiro (photo_storage_path) no bucket third-party-photos.

create type public.authorization_status as enum ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

create table if not exists public.third_party_authorizations (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  resident_id uuid not null references public.residents (id) on delete cascade,
  created_by_profile uuid not null references public.profiles (id) on delete cascade,
  package_id uuid references public.packages (id) on delete set null,
  authorized_name text not null,
  authorized_document text,
  observation text,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null default now() + interval '48 hours',
  status public.authorization_status not null default 'ACTIVE',
  used_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null,
  photo_storage_path text,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authz_valid_window check (valid_until > valid_from)
);

create index if not exists third_party_authz_resident_idx
  on public.third_party_authorizations (resident_id, status);
create index if not exists third_party_authz_condo_idx
  on public.third_party_authorizations (condominium_id, status);
create index if not exists third_party_authz_doc_idx
  on public.third_party_authorizations (authorized_document)
  where authorized_document is not null;

alter table public.third_party_authorizations enable row level security;

create policy authz_select_resident on public.third_party_authorizations
  for select using (resident_id = any (public.get_my_resident_ids()));

create policy authz_insert_resident on public.third_party_authorizations
  for insert with check (
    resident_id = any (public.get_my_resident_ids())
    and created_by_profile = auth.uid()
    and condominium_id = public.get_my_condominium_id()
  );

-- Morador só pode cancelar a própria autorização (ACTIVE → CANCELLED).
create policy authz_update_resident_cancel on public.third_party_authorizations
  for update using (resident_id = any (public.get_my_resident_ids()))
  with check (status = 'CANCELLED');

-- Operacionais: leitura + marcar como USED no próprio condomínio.
create policy authz_select_operational on public.third_party_authorizations
  for select using (
    public.can_manage_condominium(condominium_id) or public.has_operational_access(condominium_id)
  );

create policy authz_update_operational_used on public.third_party_authorizations
  for update using (
    public.can_manage_condominium(condominium_id) or public.has_operational_access(condominium_id)
  )
  with check (status = 'USED');

-- Preenche canceled_by/at quando o morador cancela.
create or replace function public.on_authz_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'CANCELLED' and old.status <> 'CANCELLED' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
    new.cancelled_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists third_party_authz_set_cancelled on public.third_party_authorizations;
create trigger third_party_authz_set_cancelled
  before update on public.third_party_authorizations
  for each row execute function public.on_authz_cancelled();

-- ------------------------------------------------------------
-- confirm_package_collection estendida (Etapa 8)
-- Remove o overload antigo (5 params, Etapa 7) para não gerar
-- ambiguidade PGRST203 no PostgREST quando os novos parâmetros
-- opcionais são omitidos.
-- ------------------------------------------------------------
drop function if exists public.confirm_package_collection(uuid, text, uuid, text, text);

create or replace function public.confirm_package_collection(
  p_package_id uuid,
  p_collection_type text default 'RESIDENT',
  p_third_party_auth_id uuid default null,
  p_ip text default null,
  p_user_agent text default null,
  p_photo_storage_path text default null,
  p_authorized_name text default null
)
returns table (success boolean, message text, final_status text, event_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_condo         uuid;
  v_resident      uuid;
  v_code          text;
  v_updated       int;
  v_status        text;
  v_collected_at  timestamptz;
  v_event_id      uuid;
  v_resident_user uuid;
  v_final_status  text;
  v_event_type    text;
  v_auth          record;
begin
  select condominium_id, resident_id, internal_code
    into v_condo, v_resident, v_code
    from public.packages
   where id = p_package_id;

  if v_condo is null then
    return query select false, 'Encomenda não encontrada.', null::text, null::uuid;
    return;
  end if;

  if not (
    public.can_manage_condominium(v_condo) or public.has_operational_access(v_condo)
  ) then
    raise exception 'Sem permissão para confirmar retiradas';
  end if;

  if p_collection_type not in ('RESIDENT', 'THIRD_PARTY') then
    p_collection_type := 'RESIDENT';
  end if;

  if p_collection_type = 'THIRD_PARTY' then
    v_final_status := 'RETIRADA_POR_TERCEIRO';
    v_event_type   := 'PACKAGE_COLLECTED_BY_THIRD_PARTY';

    if p_third_party_auth_id is null then
      return query select false, 'Retirada por terceiro exige a autorização do morador.', null::text, null::uuid;
      return;
    end if;

    select status, valid_until, resident_id, package_id
      into v_auth
      from public.third_party_authorizations
     where id = p_third_party_auth_id;

    if v_auth.status is null then
      return query select false, 'Autorização não encontrada.', null::text, null::uuid;
      return;
    end if;

    if v_auth.status = 'CANCELLED' then
      return query select false, 'Autorização cancelada.', null::text, null::uuid;
      return;
    elsif v_auth.status = 'USED' then
      return query select false, 'Autorização já utilizada.', null::text, null::uuid;
      return;
    elsif v_auth.status = 'EXPIRED' or v_auth.valid_until < now() then
      return query select false,
        'Autorização expirada em ' || to_char(v_auth.valid_until, 'DD/MM/YYYY HH24:MI') || '.',
        null::text, null::uuid;
      return;
    end if;

    if v_auth.package_id is not null then
      if v_auth.package_id <> p_package_id then
        return query select false, 'Autorização é válida apenas para a encomenda específica.', null::text, null::uuid;
        return;
      end if;
    elsif v_auth.resident_id <> v_resident then
      return query select false, 'Autorização não pertence ao morador desta encomenda.', null::text, null::uuid;
      return;
    end if;
  else
    v_final_status := 'RETIRADA';
    v_event_type   := 'PACKAGE_COLLECTED';
  end if;

  update public.packages
     set status         = v_final_status::public.package_status,
         collected_by   = auth.uid(),
         collected_at   = now(),
         collection_type = p_collection_type
   where id = p_package_id
     and status in ('AGUARDANDO_RETIRADA'::public.package_status, 'NAO_IDENTIFICADA'::public.package_status)
     and active = true;
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    select status, collected_at
      into v_status, v_collected_at
      from public.packages
     where id = p_package_id;
    if v_status = 'RETIRADA' and v_collected_at is not null then
      return query select false,
        'Esta encomenda já foi retirada em ' ||
        to_char(v_collected_at, 'DD/MM/YYYY HH24:MI') || '.',
        'RETIRADA', null::uuid;
    elsif v_status = 'RETIRADA_POR_TERCEIRO' and v_collected_at is not null then
      return query select false,
        'Esta encomenda já foi retirada por terceiro em ' ||
        to_char(v_collected_at, 'DD/MM/YYYY HH24:MI') || '.',
        'RETIRADA_POR_TERCEIRO', null::uuid;
    else
      return query select false,
        'Não foi possível retirar. Status atual: ' || coalesce(v_status, 'desconhecido') || '.',
        v_status, null::uuid;
    end if;
    return;
  end if;

  -- MESMA TRANSAÇÃO: consome a autorização junto com a retirada.
  if p_collection_type = 'THIRD_PARTY' then
    update public.third_party_authorizations
       set status = 'USED',
           used_at = now(),
           used_by = auth.uid(),
           photo_storage_path = p_photo_storage_path
     where id = p_third_party_auth_id
       and status = 'ACTIVE';
  end if;

  insert into public.package_events (package_id, event_type, payload, user_id)
  values (
    p_package_id, v_event_type,
    jsonb_build_object(
      'collection_type', p_collection_type,
      'collected_at', now(),
      'third_party_auth_id', p_third_party_auth_id,
      'authorized_name', p_authorized_name,
      'photo_storage_path', p_photo_storage_path
    ),
    auth.uid()
  )
  returning id into v_event_id;

  insert into public.audit_logs (
    user_id, action, entity, entity_id, old_values, new_values, ip_address, user_agent
  ) values (
    auth.uid(), 'PACKAGE_COLLECTED', 'packages', p_package_id,
    jsonb_build_object('status', 'AGUARDANDO_RETIRADA'),
    jsonb_build_object(
      'status', v_final_status,
      'collected_at', now(),
      'authorized_name', p_authorized_name,
      'photo_storage_path', p_photo_storage_path
    ),
    p_ip, p_user_agent
  );

  if v_resident is not null then
    select profile_id into v_resident_user
      from public.residents
     where id = v_resident;
    if v_resident_user is not null then
      insert into public.notifications (user_id, type, title, message, reference_id)
      values (
        v_resident_user, 'PACKAGE_COLLECTED', 'Encomenda retirada',
        format(
          'Sua encomenda %s foi retirada%s na portaria.',
          v_code,
          case when p_authorized_name is not null then ' por ' || p_authorized_name else '' end
        ),
        p_package_id
      );
    end if;
  end if;

  return query select true, 'Retirada confirmada com sucesso.', v_final_status, v_event_id;
end;
$$;

grant execute on function public.confirm_package_collection(uuid, text, uuid, text, text, text, text) to authenticated;