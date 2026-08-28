-- ============================================================
-- 0002_seed_roles.sql
-- Etapa 2 — Seed de papéis demo
--
-- Condomínio: "Residencial das Flores" (blocos A/B + unidades)
-- 7 perfis: 1 SUPER_ADMIN, 1 SYNDIC, 2 operacionais, 3 RESIDENT
--
-- Contas de teste (login e-mail + senha):
--   admin@condominio.dev    / admin       (SUPER_ADMIN)
--   sindico@condominio.dev  / sindico     (SYNDIC)
--   porteiro@condominio.dev / porteiro    (DOORMAN)
--   recepcao@condominio.dev / recepcao    (RECEPTIONIST)
--   ana@condominio.dev      / morador1    (RESIDENT - Bloco A 101)
--   bruno@condominio.dev    / morador2    (RESIDENT - Bloco A 102)
--   carla@condominio.dev    / morador3    (RESIDENT - Bloco B 201)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Condomínio demo
-- ------------------------------------------------------------
insert into public.condominiums (id, name, cnpj, phone, email, address, syndic_name, admin_phone)
values (
  '11111111-1111-1111-1111-111111111111',
  'Residencial das Flores',
  '12345678000195',
  '(11) 3456-7890',
  'contato@residencialdasflores.com.br',
  jsonb_build_object(
    'street', 'Rua das Flores',
    'number', '123',
    'complement', 'Condomínio principal',
    'neighborhood', 'Jardim Primavera',
    'city', 'São Paulo',
    'state', 'SP',
    'zipcode', '01000-000'
  ),
  'Fernanda Oliveira',
  '(11) 98765-4321'
);

-- ------------------------------------------------------------
-- 2. Blocos
-- ------------------------------------------------------------
insert into public.buildings (id, condominium_id, name, identifier)
values
  ('22222222-2222-2222-2222-111111111111', '11111111-1111-1111-1111-111111111111', 'Bloco A', 'A'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bloco B', 'B');

-- ------------------------------------------------------------
-- 3. Unidades
-- ------------------------------------------------------------
insert into public.units (id, condominium_id, building_id, number, floor)
values
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-111111111111', '101', '1'),
  ('33333333-3333-3333-3333-333333333002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-111111111111', '102', '1'),
  ('33333333-3333-3333-3333-333333333003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-111111111111', '201', '2'),
  ('33333333-3333-3333-3333-444444444001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '101', '1'),
  ('33333333-3333-3333-3333-444444444002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '201', '2');

-- ------------------------------------------------------------
-- 4. Usuários demo (auth.users + auth.identities)
-- O trigger on_auth_user_created cria o profile automaticamente.
-- ------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  (
    '44444444-4444-4444-4444-444444444401',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@condominio.dev', crypt('admin', gen_salt('bf')),
    now(),
    '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Administrador Master"}',
    now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'sindico@condominio.dev', crypt('sindico', gen_salt('bf')),
    now(),
    '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Fernanda Oliveira"}',
    now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'porteiro@condominio.dev', crypt('porteiro', gen_salt('bf')),
    now(),
    '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"João Porteiro"}',
    now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444404',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'recepcao@condominio.dev', crypt('recepcao', gen_salt('bf')),
    now(),
    '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Maria Recepção"}',
    now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444405',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'ana@condominio.dev', crypt('morador1', gen_salt('bf')),
    now(),
    '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ana Souza"}',
    now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444406',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'bruno@condominio.dev', crypt('morador2', gen_salt('bf')),
    now(),
    '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Bruno Lima"}',
    now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444407',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'carla@condominio.dev', crypt('morador3', gen_salt('bf')),
    now(),
    '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Carla Mendes"}',
    now(), now()
  );

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  (
    '44444444-4444-4444-4444-444444444401', '44444444-4444-4444-4444-444444444401',
    '44444444-4444-4444-4444-444444444401',
    jsonb_build_object('sub', '44444444-4444-4444-4444-444444444401', 'email', 'admin@condominio.dev'),
    'email', now(), now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444402', '44444444-4444-4444-4444-444444444402',
    '44444444-4444-4444-4444-444444444402',
    jsonb_build_object('sub', '44444444-4444-4444-4444-444444444402', 'email', 'sindico@condominio.dev'),
    'email', now(), now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444403', '44444444-4444-4444-4444-444444444403',
    '44444444-4444-4444-4444-444444444403',
    jsonb_build_object('sub', '44444444-4444-4444-4444-444444444403', 'email', 'porteiro@condominio.dev'),
    'email', now(), now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444404', '44444444-4444-4444-4444-444444444404',
    '44444444-4444-4444-4444-444444444404',
    jsonb_build_object('sub', '44444444-4444-4444-4444-444444444404', 'email', 'recepcao@condominio.dev'),
    'email', now(), now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444405', '44444444-4444-4444-4444-444444444405',
    '44444444-4444-4444-4444-444444444405',
    jsonb_build_object('sub', '44444444-4444-4444-4444-444444444405', 'email', 'ana@condominio.dev'),
    'email', now(), now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444406', '44444444-4444-4444-4444-444444444406',
    '44444444-4444-4444-4444-444444444406',
    jsonb_build_object('sub', '44444444-4444-4444-4444-444444444406', 'email', 'bruno@condominio.dev'),
    'email', now(), now(), now()
  ),
  (
    '44444444-4444-4444-4444-444444444407', '44444444-4444-4444-4444-444444444407',
    '44444444-4444-4444-4444-444444444407',
    jsonb_build_object('sub', '44444444-4444-4444-4444-444444444407', 'email', 'carla@condominio.dev'),
    'email', now(), now(), now()
  );

-- ------------------------------------------------------------
-- 5. Profiles — preenche role + dados pessoais (criados pelo trigger)
-- ------------------------------------------------------------
update public.profiles set
  role = 'SUPER_ADMIN',
  full_name = 'Administrador Master',
  cpf = '28665480781',
  phone = '(11) 90000-0001'
where id = '44444444-4444-4444-4444-444444444401';

update public.profiles set
  role = 'SYNDIC',
  full_name = 'Fernanda Oliveira',
  cpf = '19732218967',
  phone = '(11) 90000-0002'
where id = '44444444-4444-4444-4444-444444444402';

update public.profiles set
  role = 'DOORMAN',
  full_name = 'João Porteiro',
  cpf = '16963563349',
  phone = '(11) 90000-0003'
where id = '44444444-4444-4444-4444-444444444403';

update public.profiles set
  role = 'RECEPTIONIST',
  full_name = 'Maria Recepção',
  cpf = '49742321930',
  phone = '(11) 90000-0004'
where id = '44444444-4444-4444-4444-444444444404';

update public.profiles set
  role = 'RESIDENT',
  full_name = 'Ana Souza',
  cpf = '17538108335',
  phone = '(11) 90000-0005'
where id = '44444444-4444-4444-4444-444444444405';

update public.profiles set
  role = 'RESIDENT',
  full_name = 'Bruno Lima',
  cpf = '79356345139',
  phone = '(11) 90000-0006'
where id = '44444444-4444-4444-4444-444444444406';

update public.profiles set
  role = 'RESIDENT',
  full_name = 'Carla Mendes',
  cpf = '98504877477',
  phone = '(11) 90000-0007'
where id = '44444444-4444-4444-4444-444444444407';

-- ------------------------------------------------------------
-- 6. Vínculos de condomínio (condo_memberships)
-- ------------------------------------------------------------
insert into public.condo_memberships (id, profile_id, condominium_id, unit_id, role)
values
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', null, 'SUPER_ADMIN'),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111', null, 'SYNDIC'),
  ('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111111', null, 'DOORMAN'),
  ('55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111111', null, 'RECEPTIONIST'),
  ('55555555-5555-5555-5555-555555555505', '44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333001', 'RESIDENT'),
  ('55555555-5555-5555-5555-555555555506', '44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333002', 'RESIDENT'),
  ('55555555-5555-5555-5555-555555555507', '44444444-4444-4444-4444-444444444407', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-444444444002', 'RESIDENT');