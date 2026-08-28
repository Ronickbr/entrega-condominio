-- ============================================================
-- Migration: Add resident PIN verification to confirm_package_collection
-- ============================================================

drop function if exists public.confirm_package_collection(uuid, text, uuid, text, text, text, text);

create or replace function public.confirm_package_collection(
  p_package_id uuid,
  p_collection_type text default 'RESIDENT',
  p_third_party_auth_id uuid default null,
  p_ip text default null,
  p_user_agent text default null,
  p_photo_storage_path text default null,
  p_authorized_name text default null,
  p_resident_pin text default null
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
  v_stored_pin    text;
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

    -- Verify resident PIN if the package is linked to a resident
    if v_resident is not null then
      select pin_code into v_stored_pin
        from public.residents
       where id = v_resident;

      if v_stored_pin is not null and v_stored_pin <> '' then
        if p_resident_pin is null or p_resident_pin = '' then
          return query select false, 'PIN do morador é obrigatório para confirmar a retirada.', null::text, null::uuid;
          return;
        end if;
        if p_resident_pin <> v_stored_pin then
          return query select false, 'PIN incorreto. Verifique o PIN de 4 dígitos do morador.', null::text, null::uuid;
          return;
        end if;
      end if;
    end if;
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
        'Esta encomenda já foi retirada em ' || to_char(v_collected_at, 'DD/MM/YYYY HH24:MI') || '.',
        v_status, null::uuid;
      return;
    else
      return query select false, 'Encomenda não está pendente de retirada.', v_status, null::uuid;
      return;
    end if;
  end if;

  v_event_id := gen_random_uuid();
  insert into public.package_events (
    id,
    package_id,
    event_type,
    actor_id,
    metadata
  ) values (
    v_event_id,
    p_package_id,
    v_event_type::public.package_event_type,
    auth.uid(),
    jsonb_build_object(
      'code', v_code,
      'collection_type', p_collection_type,
      'ip', p_ip,
      'user_agent', p_user_agent,
      'photo_storage_path', p_photo_storage_path,
      'authorized_name', p_authorized_name
    )
  );

  if p_collection_type = 'THIRD_PARTY' and p_third_party_auth_id is not null then
    update public.third_party_authorizations
       set status = 'USED',
           updated_at = now()
     where id = p_third_party_auth_id;
  end if;

  return query select true, 'Encomenda retirada com sucesso!', v_final_status, v_event_id;
end;
$$;

grant execute on function public.confirm_package_collection(uuid, text, uuid, text, text, text, text, text) to authenticated;
