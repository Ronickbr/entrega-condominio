-- Etapa 7 — Retirada atômica + prevenção duplicada + auditoria
-- RPC confirm_package_collection:
--   UPDATE atômico (status IN pendentes) → 1 linha vencedora; a 2ª chamada concorrente
--   retorna mensagem amigável ("já retirada em ...") em vez de erro.
--   Cria evento, notificação para o morador e audit_logs (IP/user_agent opcionais).
--   Morador/sem permissão recebe exceção (PostgREST → 400).

create or replace function public.confirm_package_collection(
  p_package_id uuid,
  p_collection_type text default 'RESIDENT',
  p_third_party_auth_id uuid default null,
  p_ip text default null,
  p_user_agent text default null
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

  if p_collection_type = 'THIRD_PARTY' and p_third_party_auth_id is null then
    return query select false, 'Retirada por terceiro exige a autorização do morador.', null::text, null::uuid;
    return;
  end if;

  if p_collection_type = 'THIRD_PARTY' then
    v_final_status := 'RETIRADA_POR_TERCEIRO';
    v_event_type   := 'PACKAGE_COLLECTED_BY_THIRD_PARTY';
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

  insert into public.package_events (package_id, event_type, payload, user_id)
  values (
    p_package_id, v_event_type,
    jsonb_build_object(
      'collection_type', p_collection_type,
      'collected_at', now(),
      'third_party_auth_id', p_third_party_auth_id
    ),
    auth.uid()
  )
  returning id into v_event_id;

  insert into public.audit_logs (
    user_id, action, entity, entity_id, old_values, new_values, ip_address, user_agent
  ) values (
    auth.uid(), 'PACKAGE_COLLECTED', 'packages', p_package_id,
    jsonb_build_object('status', 'AGUARDANDO_RETIRADA'),
    jsonb_build_object('status', v_final_status, 'collected_at', now()),
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
        format('Sua encomenda %s foi retirada na portaria.', v_code),
        p_package_id
      );
    end if;
  end if;

  return query select true, 'Retirada confirmada com sucesso.', v_final_status, v_event_id;
end;
$$;

revoke execute on function public.confirm_package_collection(uuid, text, uuid, text, text) from public;
grant execute on function public.confirm_package_collection(uuid, text, uuid, text, text) to authenticated;