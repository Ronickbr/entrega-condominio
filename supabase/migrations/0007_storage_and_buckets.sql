-- ============================================================
-- 0007_storage_and_buckets.sql
-- Etapa 4 — Storage: buckets privados + RLS em storage.objects
--
-- 5 buckets (todos privados, public = false):
--   package-labels, package-images, third-party-photos,
--   avatars, condominium-assets
-- Acesso externo via URLs assinadas (signed URLs). RLS em
-- storage.objects segue as mesmas regras das tabelas públicas:
--   INSERT → operacionais do condomínio (1º folder = condominium_id)
--   SELECT → quem tem acesso ao condomínio (has_condominium_access)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Buckets
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('package-labels', 'package-labels', false),
  ('package-images', 'package-images', false),
  ('third-party-photos', 'third-party-photos', false),
  ('avatars', 'avatars', false),
  ('condominium-assets', 'condominium-assets', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2. RLS em storage.objects
-- ------------------------------------------------------------
-- Admin global: tudo
create policy storage_objects_admin_all on storage.objects
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Operacionais podem enviar fotos nos buckets de encomendas
-- (o 1º segmento do path é o id do condomínio).
create policy storage_objects_insert_photo_operational on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('package-labels', 'package-images', 'third-party-photos')
    and public.has_operational_access((storage.foldername(name))[1]::uuid)
  );

-- Leitura: quem tem acesso ao condomínio dono do objeto
create policy storage_objects_select_photo_condo_access on storage.objects
  for select
  to authenticated
  using (
    bucket_id in ('package-labels', 'package-images', 'third-party-photos')
    and public.has_condominium_access((storage.foldername(name))[1]::uuid)
  );