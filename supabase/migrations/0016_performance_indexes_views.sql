-- ============================================================
-- 0016_performance_indexes_views.sql
-- Etapa 9 — Dashboards + Relatórios + Busca Global Otimizada
--
-- 1. Extensão pg_trgm + índices GIN (busca por similaridade)
-- 2. Índices de performance em packages/residents/staff
-- 3. RPC get_dashboard_overview (métricas consolidadas em JSONB)
-- 4. RPC global_search (trigram: unidades/moradores/encomendas/autorizações)
--
-- Nota: as Views previstas na spec (vw_package_metrics etc.) foram
-- omitidas — as métricas são entregues pela RPC única, que já aplica
-- o gate de permissão por condomínio (padrão das Etapas 6/7).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extensão pg_trgm
-- ------------------------------------------------------------
create extension if not exists pg_trgm;

-- ------------------------------------------------------------
-- 2. Índices de performance
-- ------------------------------------------------------------
create index if not exists packages_condo_received_idx
  on public.packages (condominium_id, received_at desc);
create index if not exists packages_collected_at_idx
  on public.packages (collected_at);
create index if not exists packages_carrier_idx
  on public.packages (carrier);
create index if not exists packages_status_idx
  on public.packages (status);
create index if not exists residents_active_idx
  on public.residents (active);
create index if not exists staff_active_idx
  on public.staff (active);

-- Índices trigram para a busca global
create index if not exists units_number_trgm_idx
  on public.units using gin (number gin_trgm_ops);
create index if not exists profiles_full_name_trgm_idx
  on public.profiles using gin (full_name gin_trgm_ops);
create index if not exists packages_internal_code_trgm_idx
  on public.packages using gin (internal_code gin_trgm_ops);
create index if not exists packages_tracking_code_trgm_idx
  on public.packages using gin (tracking_code gin_trgm_ops);
create index if not exists packages_recipient_trgm_idx
  on public.packages using gin (recipient_name_raw gin_trgm_ops);

-- ------------------------------------------------------------
-- 3. RPC get_dashboard_overview
--    Acesso: SUPER_ADMIN/SYNDIC/DOORMAN/RECEPTIONIST do condomínio.
--    Morador e condomínio alheio → exceção (bloqueio no backend).
-- ------------------------------------------------------------
create or replace function public.get_dashboard_overview(
  p_condominium_id uuid,
  p_start date default null,
  p_end date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date := coalesce(p_start, current_date - 30);
  v_end   date := coalesce(p_end, current_date);
begin
  if not (
    public.can_manage_condominium(p_condominium_id)
    or public.has_operational_access(p_condominium_id)
  ) then
    raise exception 'Sem permissão para acessar o dashboard';
  end if;

  return jsonb_build_object(
    'received_today', (
      select count(*)::int from public.packages p
      where p.condominium_id = p_condominium_id
        and p.active
        and p.received_at >= current_date
    ),
    'received_week', (
      select count(*)::int from public.packages p
      where p.condominium_id = p_condominium_id
        and p.active
        and p.received_at >= now() - interval '7 days'
    ),
    'received_period', (
      select count(*)::int from public.packages p
      where p.condominium_id = p_condominium_id
        and p.active
        and p.received_at >= v_start::timestamptz
        and p.received_at < (v_end + 1)::timestamptz
    ),
    'pending_total', (
      select count(*)::int from public.packages p
      where p.condominium_id = p_condominium_id
        and p.active
        and p.status in ('AGUARDANDO_RETIRADA', 'NAO_IDENTIFICADA')
    ),
    'pending_24h', (
      select count(*)::int from public.packages p
      where p.condominium_id = p_condominium_id
        and p.active
        and p.status in ('AGUARDANDO_RETIRADA', 'NAO_IDENTIFICADA')
        and p.received_at <= now() - interval '24 hours'
    ),
    'pending_48h', (
      select count(*)::int from public.packages p
      where p.condominium_id = p_condominium_id
        and p.active
        and p.status in ('AGUARDANDO_RETIRADA', 'NAO_IDENTIFICADA')
        and p.received_at <= now() - interval '48 hours'
    ),
    'pending_72h', (
      select count(*)::int from public.packages p
      where p.condominium_id = p_condominium_id
        and p.active
        and p.status in ('AGUARDANDO_RETIRADA', 'NAO_IDENTIFICADA')
        and p.received_at <= now() - interval '72 hours'
    ),
    'collected_today', (
      select count(*)::int from public.packages p
      where p.condominium_id = p_condominium_id
        and p.active
        and p.collected_at >= current_date
    ),
    'avg_hours_to_collect', round(coalesce((
      select avg(extract(epoch from (p.collected_at - p.received_at)) / 3600.0)
      from public.packages p
      where p.condominium_id = p_condominium_id
        and p.active
        and p.collected_at is not null
        and p.collected_at >= v_start::timestamptz
        and p.collected_at < (v_end + 1)::timestamptz
    ), 0)::numeric, 1),
    'residents_active', (
      select count(*)::int
      from public.residents r
      join public.units u on u.id = r.unit_id
      where u.condominium_id = p_condominium_id
        and r.active
    ),
    'staff_active', (
      select count(*)::int
      from public.staff s
      where s.condominium_id = p_condominium_id
        and s.active
    ),
    'carriers_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object('carrier', x.carrier, 'count', x.cnt) order by x.cnt desc)
      from (
        select coalesce(p.carrier, 'Sem transportadora') as carrier, count(*)::int as cnt
        from public.packages p
        where p.condominium_id = p_condominium_id
          and p.active
          and p.received_at >= v_start::timestamptz
          and p.received_at < (v_end + 1)::timestamptz
        group by 1
      ) x
    ), '[]'::jsonb),
    'top_units', coalesce((
      select jsonb_agg(jsonb_build_object('unit', x.unit, 'count', x.cnt) order by x.cnt desc, x.unit)
      from (
        select coalesce(b.name || '-' || u.number, u.number) as unit, count(*)::int as cnt
        from public.packages p
        join public.units u on u.id = p.unit_id
        left join public.buildings b on b.id = u.building_id
        where p.condominium_id = p_condominium_id
          and p.active
          and p.received_at >= v_start::timestamptz
          and p.received_at < (v_end + 1)::timestamptz
        group by 1
        order by cnt desc, unit
        limit 5
      ) x
    ), '[]'::jsonb),
    'daily_timeseries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', to_char(d.d, 'YYYY-MM-DD'),
        'received', (
          select count(*)::int from public.packages p
          where p.condominium_id = p_condominium_id
            and p.active
            and p.received_at >= d.d
            and p.received_at < d.d + interval '1 day'
        ),
        'collected', (
          select count(*)::int from public.packages p
          where p.condominium_id = p_condominium_id
            and p.collected_at >= d.d
            and p.collected_at < d.d + interval '1 day'
        )
      ) order by d.d)
      from generate_series(v_start, v_end, '1 day') as d(d)
    ), '[]'::jsonb),
    'whatsapp_failed_7d', (
      select count(*)::int from public.whatsapp_messages w
      where w.condominium_id = p_condominium_id
        and w.status = 'FAILED'
        and w.created_at >= now() - interval '7 days'
    ),
    'storage_used_bytes', coalesce((
      select sum(round(coalesce((o.metadata ->> 'size')::bigint, 0)))
      from storage.objects o
      where o.bucket_id in ('package-labels', 'package-images', 'third-party-photos', 'avatars', 'condominium-assets')
        and split_part(o.name, '/', 1) = p_condominium_id::text
    ), 0)
  );
end;
$$;

-- ------------------------------------------------------------
-- 4. RPC global_search
--    Acesso: SUPER_ADMIN/SYNDIC/DOORMAN/RECEPTIONIST do condomínio.
--    Busca por similaridade (pg_trgm) em unidades/moradores/
--    encomendas/autorizações, com score decrescente.
-- ------------------------------------------------------------
create or replace function public.global_search(
  p_condominium_id uuid,
  p_term text,
  p_limit int default 20
)
returns table (
  id uuid,
  category text,
  title text,
  subtitle text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term  text := lower(btrim(coalesce(p_term, '')));
  v_limit int := greatest(coalesce(p_limit, 20), 1);
begin
  if not (
    public.can_manage_condominium(p_condominium_id)
    or public.has_operational_access(p_condominium_id)
  ) then
    raise exception 'Sem permissão para busca global';
  end if;

  if v_term = '' then
    return;
  end if;

  return query
  with results as (
    -- Unidades
    select
      u.id, 'unit'::text as category,
      ('Unidade ' || coalesce(b.name || '-', '') || u.number) as title,
      coalesce(b.name, 'Sem bloco') as subtitle,
      greatest(similarity(u.number, v_term),
               case when u.number ilike '%' || v_term || '%' then 0.5 else 0 end) as score
    from public.units u
    left join public.buildings b on b.id = u.building_id
    where u.condominium_id = p_condominium_id
      and (u.number ilike '%' || v_term || '%'
           or similarity(u.number, v_term) > 0.25)

    union all

    -- Moradores
    select
      r.id, 'resident'::text,
      pr.full_name,
      ('Unidade ' || coalesce(b.name || '-', '') || u.number
        || coalesce(' · ' || pr.email, '')) as subtitle,
      greatest(similarity(pr.full_name, v_term),
               case when pr.full_name ilike '%' || v_term || '%'
                     or u.number ilike '%' || v_term || '%' then 0.5 else 0 end) as score
    from public.residents r
    join public.profiles pr on pr.id = r.profile_id
    join public.units u on u.id = r.unit_id
    left join public.buildings b on b.id = u.building_id
    where u.condominium_id = p_condominium_id
      and r.active
      and (pr.full_name ilike '%' || v_term || '%'
           or u.number ilike '%' || v_term || '%'
           or similarity(pr.full_name, v_term) > 0.25)

    union all

    -- Encomendas (código, rastreio, destinatário, unidade)
    select
      p.id, 'package'::text,
      p.internal_code,
      (coalesce(p.recipient_name_raw, 'Encomenda')
        || coalesce(' · unidade ' || pu.number, '')
        || coalesce(' · ' || p.tracking_code, '')) as subtitle,
      greatest(
        similarity(coalesce(p.internal_code, ''), v_term),
        similarity(coalesce(p.tracking_code, ''), v_term),
        similarity(coalesce(p.recipient_name_raw, ''), v_term),
        similarity(coalesce(pu.number, ''), v_term),
        case when p.internal_code ilike '%' || v_term || '%'
              or coalesce(p.tracking_code, '') ilike '%' || v_term || '%'
              or coalesce(p.recipient_name_raw, '') ilike '%' || v_term || '%'
              or coalesce(pu.number, '') ilike '%' || v_term || '%' then 0.5 else 0 end
      ) as score
    from public.packages p
    left join public.units pu on pu.id = p.unit_id
    where p.condominium_id = p_condominium_id
      and p.active
      and (p.internal_code ilike '%' || v_term || '%'
           or coalesce(p.tracking_code, '') ilike '%' || v_term || '%'
           or coalesce(p.recipient_name_raw, '') ilike '%' || v_term || '%'
           or coalesce(pu.number, '') ilike '%' || v_term || '%'
           or similarity(coalesce(p.tracking_code, ''), v_term) > 0.25
           or similarity(coalesce(p.recipient_name_raw, ''), v_term) > 0.25
           or similarity(coalesce(pu.number, ''), v_term) > 0.25)

    union all

    -- Autorizações de terceiro
    select
      a.id, 'authorization'::text,
      a.authorized_name,
      (case when a.package_id is null then 'Todas as encomendas'
            else 'Encomenda específica' end) as subtitle,
      greatest(similarity(a.authorized_name, v_term),
               case when a.authorized_name ilike '%' || v_term || '%' then 0.5 else 0 end) as score
    from public.third_party_authorizations a
    where a.condominium_id = p_condominium_id
      and (a.authorized_name ilike '%' || v_term || '%'
           or similarity(a.authorized_name, v_term) > 0.25)
  )
  select results.id, results.category, results.title, results.subtitle
  from results
  order by results.score desc, results.title
  limit v_limit;
end;
$$;

grant execute on function public.get_dashboard_overview(uuid, date, date) to authenticated;
grant execute on function public.global_search(uuid, text, int) to authenticated;