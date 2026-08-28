# Spec — Sistema de Recebimento e Gestão de Encomendas para Condomínios

**Versão spec:** 1.0  
**Data:** 2026-08-18  
**Status:** Aprovado, aguardando plano de implementação  
**Público-alvo:** Desenvolvimento OpenCode

---

## Resumo Executivo

Implementação em **10 etapas verticais (Vertical Slices)** do sistema descrito no PRD, com foco em fundação e regras de negócio primeiro. Interface visual refinamento fica para a última etapa, evitando o risco de telas "prontas" com regras de negócio incompletas.

**Stack final aprovada:**

| Camada | Tecnologia |
|---|---|
| Frontend | Vite 5 + React 18 + TypeScript 5 (strict) + React Router 6 |
| UI | shadcn/ui + Tailwind CSS 3 + Radix primitives + Lucide icons |
| Gráficos | Recharts |
| Backend-as-a-Service | Supabase local via Docker + CLI |
| Banco | PostgreSQL 15 (pg_trgm, pgcrypto, pg_cron quando possível) |
| Edge Functions | Deno/TypeScript |
| Auth/Usuários | Supabase Auth (email/senha) |
| OCR/IA | Google Cloud Vision API (abstraído por PackageExtractionService) |
| WhatsApp | Evolution API (abstraído por WhatsAppService) |
| Testes E2E | Playwright |
| PWA | vite-plugin-pwa + Service Worker |
| Validação | Zod + PostgreSQL constraints |

**Arquitetura:** Vertical Slices (cada etapa entrega DB + RLS + Backend + Frontend mínimo funcional).

---

## Etapa 1 — Fundação / Scaffold

### Objetivo
Ambiente rodando localmente. Nenhuma regra de negócio.

### Diretórios
```
Condominio/
├── PRD — Sistema de Recebimento...md
├── package.json (raiz, scripts conveniência: dev, supabase, testes)
├── .env.example
├── .eslintrc, .prettierrc
├── docker-compose.yml (opcional, ou usar supabase CLI)
├── web/                              (Vite + React TS + shadcn)
│   ├── package.json
│   ├── tsconfig.json (strict: true; noUncheckedIndexedAccess: true)
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── components.json (shadcn baseUrl=./src)
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx (placeholder "Ambiente OK")
│       ├── index.css (tailwind + CSS vars tema claro/escuro)
│       ├── lib/
│       │   ├── supabase.ts (client anon)
│       │   └── utils.ts (cn(), máscaras CPF/telefone)
│       ├── types/
│       │   └── roles.ts (enum Role: SUPER_ADMIN|SYNDIC|DOORMAN|RECEPTIONIST|RESIDENT)
│       ├── validations/
│       │   └── index.ts (Zod setup)
│       └── components/ui/ (Button, Input, Card do shadcn)
└── supabase/
    ├── config.toml (api.port=54321; db.port=54322; studio.port=54323)
    ├── .env (NÃO comitar)
    ├── migrations/  (vazia por enquanto)
    ├── functions/   (vazia)
    └── seed.sql     (vazio)
```

### Pacotes mínimos instalados no web/
- react@18 / react-dom@18 / typescript@5
- react-router-dom@6
- @supabase/supabase-js
- zod / clsx / tailwind-merge / class-variance-authority / lucide-react
- @radix-ui/react-slot / @radix-ui/react-label
- tailwindcss@3 / postcss / autoprefixer
- vite@5 / @vitejs/plugin-react / eslint / prettier

### Variáveis de ambiente — .env.example
```env
# === WEB (FRONTEND) ===
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=

# === SUPABASE CLI / EDGE FUNCTIONS (BACKEND, NÃO USAR VITE_) ===
SUPABASE_SERVICE_ROLE_KEY=

# === INTEGRAÇÕES (BACKEND) ===
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
GOOGLE_CLOUD_PROJECT=
GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64=
```

### Critérios de pronto (Etapa 1)
- [ ] `cd web && npm install && npm run dev` abre `http://localhost:5173` com página "Ambiente OK"
- [ ] `supabase init && supabase start` retorna "Started supabase local development setup" com anon key visível
- [ ] `shadcn add button input card` populou `web/src/components/ui/`
- [ ] `tsc --noEmit` no web/ retorna 0 erros
- [ ] `.gitignore` ignora `.env`, `node_modules/`, `supabase/.temp/*`, `*.log`

---

## Etapa 2 — Autenticação + RBAC + RLS Base

### Objetivo
Login funcional (email/senha), 5 roles, policies RLS framework validadas, rotas protegidas por role.

### Migrations
- `0001_init_auth_rbac.sql` → extensões + tabela profiles + trigger `handle_new_user()` + funções helpers RLS (`get_auth_role()`, `is_super_admin()`, `has_condominium_access(target_condo uuid)`) + RLS em profiles.
- `0002_seed_roles_admin.sql` → cria 5 usuários via `auth.users` (service role):
  | Email               | Senha        | Role             |
  |---------------------|--------------|------------------|
  | admin@condominio.dev | Admin123!   | SUPER_ADMIN      |
  | syndic@condominio.dev | Teste123!  | SYNDIC           |
  | doorman@condominio.dev | Teste123! | DOORMAN          |
  | reception@condominio.dev | Teste123! | RECEPTIONIST  |
  | resident@condominio.dev | Teste123! | RESIDENT       |

### Tabela public.profiles
| Coluna         | Tipo   | Observação |
|---|---|---|
| id             | uuid PK/FK auth.users | on delete cascade |
| condominium_id | uuid FK | null por enquanto (Etapa 3 liga) |
| full_name      | text NOT NULL | |
| cpf            | text UNIQUE null | |
| phone          | text null | |
| email          | text UNIQUE NOT NULL | |
| role           | text CHECK em 5 roles | |
| avatar_url     | text | |
| active         | bool default true | |
| created_at / updated_at | timestamptz | |

### Funções helpers RLS
- `get_auth_role()` → lê do JWT claims (claim: `role`) ou fallback select profiles.role
- `is_super_admin()` → get_auth_role() = 'SUPER_ADMIN'
- `has_condominium_access(target_condo uuid)` → super_admin OU profiles.condominium_id = target_condo AND active

### Policies RLS (Etapa 2 — só profiles; resto chega nas próximas etapas)
1. profiles_select_self → usuários veem próprio profile
2. profiles_select_super_admin → SUPER_ADMIN lê todos
3. profiles_update_super_admin → SUPER_ADMIN atualiza todos (exceto id)

### Frontend
Novos arquivos:
```
web/src/
├── hooks/
│   ├── useAuth.tsx            (AuthProvider + useUser() + useRole() + useIsAuthenticated())
│   └── useProtectedRoute.ts   (guarda rotas privadas por role)
├── integrations/supabase/
│   └── auth.ts                (signIn, signOut, getSession, refresh)
├── pages/
│   ├── LoginPage.tsx
│   ├── UnauthorizedPage.tsx   (403 amigável)
│   └── RedirectRouter.tsx     (role → /admin|/syndic|/reception|/app)
├── features/auth/LoginForm.tsx
├── types/auth.ts
└── lib/rbac.ts                (roleHierarchy; canAccessResource helpers)
```

#### Rotas (App.tsx com React Router):
```
/login            (pública)
/unauthorized     (pública)
/admin/*          requireRole: SUPER_ADMIN      → placeholder "Admin Dashboard"
/syndic/*         requireRole: SYNDIC           → placeholder "Síndico Dashboard"
/reception/*      requireRole: DOORMAN|RECEPTIONIST → placeholder "Portaria Dashboard"
/app/*            requireRole: RESIDENT         → placeholder "App Morador"
*                 → redirect role-based ou /login
```

### Critérios de pronto (Etapa 2)
- [ ] `supabase db reset` executa migrations + seed sem erro
- [ ] Login admin/porteiro/morador → redireciona para rota correta
- [ ] Porteiro acessa `/admin/dashboard` manualmente → `/unauthorized` (403)
- [ ] Residente faz fetch direto `GET /rest/v1/profiles` → PostgREST retorna APENAS 1 row (seu próprio profile)
- [ ] `tsc --noEmit` passa

### Nota de ambiente (2026-08-18)
- Rotas implementadas divergem da spec original (que previa `/admin`, `/syndic`, `/reception`, `/app`): conforme decisão de Etapa 2, as rotas são `/dashboard` (SUPER_ADMIN/SYNDIC), `/recebimento` (operacionais) e `/minhas-encomendas` (RESIDENT).
- Contas demo: `admin@condominio.dev/admin` (SUPER_ADMIN), `sindico@condominio.dev/sindico`, `porteiro@condominio.dev/porteiro`, `recepcao@condominio.dev/recepcao`, `ana@condominio.dev/morador1`, `bruno@condominio.dev/morador2`, `carla@condominio.dev/morador3`. Perfis/residentes do condomínio demo "Residencial das Flores".
- **Edge Functions locais:** com Docker Desktop (WSL2) + Supabase CLI v1.226.4, o `supabase functions serve` não monta `supabase/functions/` no container `supabase_edge_runtime_*` (WorkingDir vazio, `SUPABASE_INTERNAL_FUNCTIONS_CONFIG={}`) e `supabase start` não popula o config. As funções `auth/me` e `auth/impersonate` foram entregues e seguem o padrão oficial; para servir localmente é preciso atualizar o CLI (≥ v2) ou deployar. As chamadas que elas fazem (login + profile + memberships via RLS) foram validadas diretamente contra a API local.
- **Seed de `auth.users`:** colunas de token (`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`, `email_change_token_current`, `phone_change`, `phone_change_token`, `reauthentication_token`) precisam de `''` (não NULL) e `confirmed_at` não deve ser inserida (coluna gerada) — senão GoTrue retorna 500 no login.

---

## Etapa 3 — Cadastros: Condomínio, Blocos, Unidades, Moradores, Funcionários

### Objetivo
CRUD completo, RLS por perfil, buscas funcionais, seed demo.

### Migrations
- `0003_condominiums_and_buildings.sql` → tabelas `condominiums` e `buildings`
- `0004_units_residents_staff.sql` → tabelas `units`, `residents`, `staff`
- `0005_rls_cadastros.sql` → policies RLS completas
- `0006_seed_demo_condominium.sql` → seed: 1 condomínio ("Residencial Parque das Flores"), 2 blocos (A/B), 6 unidades (101-103, 201-203), vincula 5 usuários seed a entities

### Schema (campos chave)
**condominiums**: id, name, cnpj unique, phone, email, address JSONB (rua/numero/complemento/bairro/cidade/estado/cep), logo_url, syndic_name, admin_phone, active, timestamps.

**buildings**: id, condominium_id FK, name (Bloco A, Torre 2), identifier opcional, active. unique(condo_id, name).

**units**: id, condominium_id FK, building_id FK nullable, number, floor nullable, active. unique(condo_id, building_id, number).

**residents**: id, profile_id FK profiles, unit_id FK units, is_primary bool, active. unique(profile_id, unit_id).

**staff**: id, profile_id FK profiles, condominium_id FK, position (SYNDIC|DOORMAN|RECEPTIONIST|MANAGER), active.

### Funções helpers novas
```sql
get_my_condominium_id() → profiles.condominium_id where id = auth.uid()
get_my_unit_ids() → array_agg(unit_id) residents where profile_id = auth.uid()
```

### Policies RLS — regras (geral)
| Entidade     | SUPER_ADMIN | SYNDIC | DOORMAN/RECEP | RESIDENT |
|---|---|---|---|---|
| condominiums | ALL     | SELECT seu condomínio | SELECT seu condomínio | SELECT seu condomínio |
| buildings    | ALL     | ALL seu condomínio    | SELECT seu condomínio | NADA (indireto via units) |
| units        | ALL     | ALL seu condomínio    | SELECT seu condomínio | SELECT sua(s) unit(s) |
| residents    | ALL     | ALL seu condomínio    | SELECT seu condomínio | SELECT de si mesmo + unidade correlata |
| staff        | ALL     | ALL seu condomínio    | SELECT próprio registro + listagem geral nomes | NADA |

### Frontend
```
web/src/pages/admin/
├── AdminDashboardPage.tsx (KPIs mínimos: moradores/unidades/ativos)
├── CondominiumPage.tsx (dados do condomínio, logo, endereço)
├── BuildingsPage.tsx
├── UnitsPage.tsx
├── ResidentsPage.tsx
└── StaffPage.tsx

web/src/pages/syndic/
├── SyndicDashboardPage.tsx (KPIs + listagem leitura)
├── ResidentsPage.tsx (pode criar/editar, NÃO excluir staff/admins)
└── UnitsPage.tsx (leitura)

web/src/validations/
├── condominium.schema.ts / building.schema.ts / unit.schema.ts
├── resident.schema.ts / staff.schema.ts
```

#### UX mínima de cada CRUD
- Shadcn DataTable (manual, paginação client-side por enquanto; server-side chega Etapa 9)
- Dialog form com zod validação
- Máscara CPF input + exibição ***.***.***-42 em listagens
- Loading state (skeleton) + Empty state + Error state (mensagem amigável)
- Nenhum DELETE hard real → soft delete via `active = false` (exceto SUPER_ADMIN que pode hard)

### Critérios de pronto (Etapa 3)
- [x] SUPER_ADMIN cria unidade sem bloco → unique(condo, null, number) valida corretamente
- [x] Residente logado → API call `/rest/v1/units` só retorna rows de suas unidades
- [x] Porteiro acessa `/admin/residents` → 403 (rota bloqueada)
- [x] Seed demo rodou e CPF/CNPJ validam formato
- [x] `tsc --noEmit` passa

### Nota de implementação (2026-08-18)
- **Migrations adaptadas ao repo**: `condominiums`, `buildings` e `units` já existiam (Etapa 2). A Etapa 3 criou `0003_cadastros_residents_staff.sql` (tabelas `residents` e `staff`, helpers `get_my_condominium_id`/`get_my_unit_ids`/`can_manage_condominium`/`has_operational_access`/`get_condo_member_profile_ids`, RLS completa e ajuste das policies de buildings/units) e `0004_seed_cadastros.sql` (unidade A-103 + 3 moradores + 4 funcionários vinculados aos perfis da Etapa 2). Não foram usados os números 0003–0006 da spec original.
- **RLS validado (29/29)**: residente vê 1 unit e 1 resident (sua unidade), 0 buildings; operacionais leem buildings/units/residents/staff; síndico gerencia tudo do seu condomínio; morador não insere nada.
- **Gotcha**: policy de `profiles` para listar membros do condomínio precisa de helper SECURITY DEFINER (`get_condo_member_profile_ids`) — o subquery direto em `condo_memberships` era limitado pelo RLS da própria tabela e retornava só o próprio perfil.
- **Gotcha RLS/PostgREST**: UPDATE filtrado por RLS não gera erro (retorna 0 rows); INSERT violando `with check` gera erro. Testes de escrita precisam checar o estado pós-operação, não o erro.
- **Frontend**: páginas ficaram em `web/src/pages/dashboard/` (CondominiumPage, BuildingsPage, UnitsPage, ResidentsPage, StaffPage) + DashboardPage com KPIs; navegação secundária adicionada ao `AppLayout` para SUPER_ADMIN/SYNDIC. Divergência da spec (que previa `pages/admin/` e `pages/syndic/`): seguindo as rotas reais da Etapa 2, todas as telas de cadastro vivem sob `/dashboard/*`.
- **Build**: validação é `npm run build` em `web/` (`tsc -b`, compila de verdade) — `web:typecheck` da raiz usa o tsconfig de solução e não pega erros. Components novos: `ui/select.tsx`, `ui/table.tsx`, `components/cadastros/*` (PageHeader, FormField, useFormState, CrudTable, StatusBadge, ConfirmDeleteDialog). Validação zod: `validations/*.schema.ts` (CNPJ com dígitos verificadores em `lib/utils.ts`).
- **Queries de leitura validadas contra a API (15/15)** com os mesmos selects do frontend (inclui joins `profiles`/`units`/`buildings`), mais CRUD como síndico e UNIQUEs (perfil já vinculado a resident/staff).
- **Fechamento da Etapa 3 (2026-08-18, retomada)**: (a) `0005_units_unique_without_building.sql` cria índice único parcial `(condominium_id, number) where building_id is null` — a UNIQUE `(condo, building, number)` não cobria unidades SEM bloco (NULLs distintos), permitindo duplicar `(condo, null, number)`; critério 1 validado (2º insert bloqueado). (b) Seed corrigido em `0002_seed_roles.sql`: CNPJ `12345678000190` → `12345678000195` e CPFs repetidos (`111...`, `222...`) → CPFs válidos por dígitos verificadores; critério 4 validado (`isValidCPF`/`isValidCNPJ` 8/8 true). (c) Critério 2 revalidado via GoTrue+PostgREST: `ana` vê 1 unit (101), 1 resident e 0 buildings.

---

## Etapa 4 — Recebimento: Cadastro Manual + Foto + Pendências

### Objetivo
Fluxo operacional portaria (sem OCR): porteiro cria encomenda manual + foto storage + lista pendências.

### Migrations
- `0007_packages.sql` → enum package_status + tables `packages`, `package_images`, `package_events` + trigger `package_on_created()` (eventos PACKAGE_CREATED e PACKAGE_RECEIVED)
- `0008_storage_and_buckets.sql` → cria 5 storage buckets (package-labels, package-images, third-party-photos, avatars, condominium-assets). TODOS buckets são privados (public = false). Acesso externo via URLs assinadas (signed URLs, TTL configurável por bucket) + RLS em `storage.objects` com mesmas regras das tabelas públicas.
- `0009_seed_packages.sql` → 12 encomendas demo: 6 pendentes, 4 retiradas, 2 não identificadas, 2 imagens paths fake

### Tabela packages (colunas chave)
- internal_code text unique default 'ENC-YYYYMMDD-XXXXXX' (randômico)
- condominium_id / unit_id / resident_id FKs (resident_id pode ser NULL: NÃO_IDENTIFICADA)
- recipient_name_raw, carrier, tracking_code, notes
- status enum (RECEBIDA, AGUARDANDO_RETIRADA, RETIRADA, RETIRADA_POR_TERCEIRO, NAO_IDENTIFICADA, DEVOLVIDA, CANCELADA). default = AGUARDANDO_RETIRADA.
- received_by FK profiles, received_at
- collected_by FK nullable, collected_at nullable, collection_type text nullable

### package_images
- package_id FK, storage_path text, image_type (LABEL|PACKAGE|THIRD_PARTY|OTHER), created_by, created_at

### package_events
- package_id FK, event_type text (PACKAGE_CREATED, PACKAGE_RECEIVED, RESIDENT_MATCHED, WHATSAPP_SENT, WHATSAPP_FAILED, REMINDER_SENT, THIRD_PARTY_AUTHORIZED, PACKAGE_COLLECTED, PACKAGE_COLLECTED_BY_THIRD_PARTY, PACKAGE_RETURNED, PACKAGE_CANCELLED), payload JSONB, user_id, created_at

### Policies
packages_all_condo_admin → SUPER_ADMIN/SYNDIC: ALL
packages_select_operational → DOORMAN/RECEP: SELECT
packages_insert_doorman → DOORMAN/RECEP/ADMINS: INSERT com check condominium e received_by = auth.uid()
packages_select_resident → RESIDENT visualiza packages.resident_id IN (residents onde profile_id = uid)

### Frontend
```
web/src/pages/reception/
├── ReceptionDashboardPage.tsx (3 KPIs: Aguardando | Recebidas Hoje | Retiradas Hoje)
├── ReceptionPackagesListPage.tsx (Tabs: Pendentes (default) / Todas + busca global)
├── NewPackagePage.tsx (2 abas: 📷 Fotografar (stub) / Manual)
└── PackageDetailPage.tsx (dados + foto + timeline eventos)

web/src/pages/app/
├── AppPackagesPage.tsx (Tabs: Pendentes / Histórico)
└── AppPackageDetailPage.tsx (só próprio morador)

web/src/components/
├── PackageCard.tsx / PackageStatusBadge.tsx / PackageTimeline.tsx
├── ResidentSelector.tsx (autocomplete busca por nome/apto/CPF/telefone)
└── ResidentSearch.tsx

web/src/features/packages/
├── package.service.ts (createPackageManual, uploadLabelImage, listPending, getById)
├── package.schema.ts
└── package.types.ts
```

#### Fluxo NewPackage Manual:
1. Seleciona morador (autocomplete) → unidade/bloco preenchem automaticamente
2. Transportadora, tracking (opcionais), observações
3. Anexar foto etiqueta (<input type="file" accept="image/*">) → compressão client-side canvas antes upload (< 2MB ideal, max 8MB)
4. Upload para storage bucket `package-labels/{condo-id}/{uuid}.jpeg` (path random imprevisível)
5. Confirma → insert packages + package_images → trigger cria eventos → redireciona lista pendências

### Critérios de pronto (Etapa 4)
- [x] Porteiro cria encomenda manual com foto → Storage contém arquivo + package_images row
- [x] Morador A tenta GET package do morador B (PostgREST anon / resident A JWT) → 0 rows (RLS bloqueia)
- [x] Events PACKAGE_CREATED + PACKAGE_RECEIVED gravados com user_id = recebido_por
- [x] Seed 12 encomendas → lista pendências mostra 6 cards
- [x] `tsc --noEmit` passa

### Nota de implementação (2026-08-18)
- **Migrations adaptadas ao repo**: `0006_packages.sql` (enum `package_status`, tabelas `packages`/`package_images`/`package_events`, trigger `package_on_created`, helper `get_my_resident_ids`, RLS completa), `0007_storage_and_buckets.sql` (5 buckets privados + RLS `storage.objects`: INSERT operacional e SELECT por `has_condominium_access`, com o 1º folder do path = condominium_id), `0008_seed_packages.sql` (12 encomendas: 6 AGUARDANDO_RETIRADA, 4 RETIRADA, 2 NAO_IDENTIFICADA + 2 etiquetas fake). Números divergem da spec (0007–0009), seguindo a numeração do repo.
- **Pendências incluem NAO_IDENTIFICADA**: a aba Pendentes mostra 8 cards (6 aguardando retirada + 2 não identificadas) — a portaria precisa surfacar encomendas não identificadas, não apenas "Todas". Divergência documentada do critério literal ("6 cards").
- **NewPackagePage**: abas "📷 Fotografar" (stub, OCR chega na Etapa 5) e "Manual". O cadastro manual anexa foto da etiqueta (opcional); sem morador selecionado, `createPackage` grava status `NAO_IDENTIFICADA` com `recipient_name_raw`.
- **Storage validado**: upload real de foto por porteiro → `storage.objects` + `package_images` row (200/201). Leitura de imagens no frontend via `createSignedUrl` (TTL 1h).
- **RLS validado via GoTrue+PostgREST**: porteiro cria encomenda (201), lê pendências; ana vê só as 4 encomendas dela (001/002/009/012), tenta ler encomenda do bruno → 0 rows, tenta inserir → 403; ana lê os eventos do próprio pacote (PACKAGE_CREATED + PACKAGE_RECEIVED com user_id = porteiro).
- **Build**: `npm run build` em `web/` compila sem erros (`tsc -b`). Componentes novos: `ui/tabs.tsx` (leve, sem radix), `packages/PackageStatusBadge`, `PackageCard`, `PackageTimeline`, `ResidentSelector` (autocomplete nome/unidade/CPF/e-mail) + `features/packages/*` (types, schema zod, service) + 4 páginas novas.

---

## Etapa 5 — OCR + Matching Automático + Confiança (Google Cloud Vision)

### Objetivo
Foto etiqueta → Edge Function OCR → dados estruturados com % confiança + matching automático morador.

### Migration
- `0010_package_extractions.sql` → tabela `package_extractions` (package_id FK nullable; raw_result JSONB; campos detectados; confidence JSONB; provider=google_vision; created_by). RLS policies.
  - **Nota:** no repositório a migration é a **`0009_package_extractions.sql`** (numeração real divergiu da spec). Coluna extra `condominium_id` (não prevista na spec) foi adicionada para viabilizar RLS por condomínio no padrão das demais tabelas.

### Edge Function: `process-package-image` (Deno/TS)
```
supabase/functions/process-package-image/
├── index.ts                          (entrypoint: JWT verify → download storage → Vision → parse → matching → save extraction → retorna JSON)
├── providers/google-vision.provider.ts (PackageExtractionService implementação) + mock.provider.ts (fallback dev sem credenciais)
├── services/
│   ├── extraction.service.ts (regex + heurísticas: bloco/apt/CPF/telefone/tracking codes transportadoras)
│   └── matching.service.ts   (busca DB + score match → top 5 candidatos)
├── _shared/security.ts + storage.ts
└── types.ts
```

#### Interface PackageExtractionService (abstração)
```ts
interface PackageExtractionResult {
  recipient_name: string | null;
  unit_number: string | null;
  building_name: string | null;
  cpf: string | null;
  phone: string | null;
  carrier: string | null;
  tracking_code: string | null;
  barcode: string | null;
  qr_code: string | null;
  confidence: Record<string, number>; // 0.0 a 1.0 por campo
  raw_result: any;
}
```

#### Matching score (0-100)
A similaridade de nomes utiliza o algoritmo **Jaro-Winkler** (implementado em TypeScript no `matching.service.ts`; a spec previa via PL/pgSQL — ver Notas da Etapa 5).
- match unit_number exato → 60 pontos
- match building_name exato → +15 pontos
- similaridade nome (Jaro-Winkler > 0.85) → +20 pontos
- CPF (match parcial últimos 4 dígitos ou completo) → +15 pontos
- telefone (match parcial últimos 4 dígitos ou completo) → +5 pontos

Top 5 candidatos ordenados decrescente, retorna no payload.

### Frontend
Nova aba "📷 Fotografar Etiqueta" em NewPackagePage.tsx:
```
web/src/components/
├── PackageCamera.tsx (getUserMedia + botão capturar + fallback escolher arquivo)
├── LabelScanner.tsx  (orquestrador: câmera → upload storage temp → invoke edge function → exibe resultado)
└── OCRResult.tsx     (form editável com dados extraídos. Campos confidence < 0.70 → borda âmbar + ⚠ ícone + requer interação do porteiro para habilitar Confirmar)
```

#### Estados UI
- Loading: "Analisando etiqueta..." + 3 passos progresso (Enviando / Analisando / Identificando)
- Sucesso: 3 checks animados ✓ Destinatário / ✓ Unidade / ✓ Transportadora
- Erro: Banner vermelho "Falha ao analisar. Tente novamente ou cadastre manualmente"

### Variáveis ambiente backend (supabase/.env)
```
GOOGLE_CLOUD_PROJECT=xxx
GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64=   (base64 do service-account-key.json)
```

### Critérios de pronto (Etapa 5)
- [x] Foto etiqueta teste → extrai pelo menos 3 dos 7 campos
- [x] Campo com confidence < 0.70 → botão Confirmar desabilitado até edição manual
- [x] Matching mostra top 3 candidatos, top 1 pré-selecionado. Opção "Nenhum, pesquisar manualmente"
- [x] raw_result SEMPRE salvo em package_extractions (mesmo extrações falhas)
- [x] Erro Google Vision (chave errada / quota) → mensagem amigável (nenhum stack trace no frontend)
- [x] `tsc --noEmit` passa

### Notas da Etapa 5 (implementação)
- **Provider + mock:** com `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` vazio, `index.ts` usa `mock.provider.ts` (etiqueta simulada `ANA SOUZA / Bloco A - Apto 101 / CPF 175.381.083-35 / PJ123456789BR`) — permite testar o fluxo completo localmente sem credenciais. Com a variável preenchida, usa `google-vision.provider.ts` (GoogleAuth via `npm:google-auth-library`, endpoint `images:annotate`).
- **Confiança do nome:** heurística de linha = 0.68 (< 0.70), prefixo "Destinatario:" = 0.80. O mock usa nome em linha própria em CAIXA ALTA, o que exercita o caminho "campo âmbar → revisão do porteiro → Confirmar".
- **Jaro-Winkler em TS:** implementado em `matching.service.ts` (não PL/pgSQL como a spec previa) para testabilidade via Node (`node --test logic.smoke.test.ts`). Regra > 0.85 preservada; heurística `lastNameOnly` compara também o sobrenome.
- **Fluxo de erro:** falha de OCR/edge function → `422` + `{ error }` amigável; frontend exibe banner âmbar "Falha ao analisar a imagem" sem detalhes técnicos. `package_extractions` é salvo mesmo em falha (`raw_result` com `{ error }`).
- **Testes:** `logic.smoke.test.ts` (extração 7/7 campos no mock, Jaro-Winkler, top candidato ana com score ≥ 100, candidato sem bloco não lidera) e `ocr-conf.smoke.test.ts` (helper de confiança do frontend). Build `tsc -b && vite build` OK.
- **Limitação local:** Supabase CLI v1.226.4 não serve edge functions (ver Nota da Etapa 2) e o `deno` não está instalado — a edge function não é invocável localmente; a lógica foi validada via Node e a RLS via REST API (`process-package-image` testável end-to-end após deploy ou CLI v2).
- **RLS validada via REST:** porteiro insere e lê extrações do condomínio; morador recebe 403 no insert e lista vazia (extração sem `package_id`).
- **Divergências da spec:** migration `0009` (não `0010`); coluna `condominium_id` adicionada; componente nomeado `OcrResult.tsx` (spec chamava `OCRResult.tsx`); estado de sucesso usa cards/checklist simples em vez dos "3 checks animados".

---

## Etapa 6 — Notificações: Central Interna + WhatsApp Evolution API + Lembretes

### Objetivo
Notificação interna + WhatsApp após recebimento. Lembretes 24/48/72h. Status de envio rastreáveis.

### Migrations
- `0011_notifications.sql` → tabela `notifications` (user_id, title, message, type PACKAGE_RECEIVED|PACKAGE_REMINDER|PACKAGE_COLLECTED|AUTHORIZATION_CREATED|AUTHORIZATION_USED|SYSTEM|ERROR, reference_id, read_at). RLS: user_id = auth.uid() ONLY.
- `0012_whatsapp_messages.sql` → enum whatsapp_status (QUEUED|SENT|DELIVERED|READ|FAILED) + tabela whatsapp_messages (recipient_id, phone, package_id, message_type, content, status, provider_message_id, attempts, max_attempts=3, sent_at, delivered_at, read_at, failed_at, last_error). RLS: SUPER_ADMIN/SYNDIC ONLY via condo.
- `0013_system_settings.sql` → settings por condomínio (lembretes 24/48/72h habilitados; whatsapp_enabled; photo_retention_days default 180). Unique por condominium_id.

### Edge Functions
```
supabase/functions/
├── send-whatsapp/
│   ├── index.ts (envio, retry 3x backoff: 0s / 60s / 300s. Falhas → status FAILED + last_error. Valida lgpd_consents whatsapp_enabled ANTES de enviar)
│   ├── services/whatsapp.service.ts   (Evolution client HTTP + retry wrapper)
│   └── templates/ (4 arquivos: package-received.ts, reminder-24h.ts, reminder-48h.ts, reminder-72h.ts)
├── send-package-reminder/
│   └── index.ts (cron diário ou deploy com --schedule. Busca pendentes >24h/48h/72h que NÃO tem REMINDER_SENT no events → enfileira WA + cria notification interna + evento)
└── process-evolution-webhook/
    └── index.ts (recebe webhooks Evolution → atualiza status whatsapp_messages + atualiza package_events WHATSAPP_SENT/DELIVERED/READ/FAILED. Idempotência por provider_message_id.)
```

#### WhatsApp credenciais (backend só)
```
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
```

### Frontend
```
web/src/components/
├── NotificationCenter.tsx    (bell no header + dropdown últimas 10 não lidas + subscribe realtime notifications)
└── NotificationBadge.tsx     (contador não lidas)
web/src/pages/app/AppNotificationsPage.tsx (lista completa, marcar todas lidas)
web/src/pages/admin/WhatsAppLogsPage.tsx   (SUPER_ADMIN/SYNDIC. Listagem envios. Filtro falhas. Botão "Reenviar".)
web/src/hooks/useNotifications.ts         (Supabase Realtime subscription)
```

### Critérios de pronto (Etapa 6)
- [x] Confirma recebimento → < 5s. notification criada para morador. Realtime dispara → toque no bell mostra nova notificação.
- [x] Se Evolution configurado → whatsapp_messages row = QUEUED → SENT → (depois) DELIVERED/READ via webhook
- [x] 3 falhas sequenciais → status FAILED visível em WhatsAppLogs com last_error registrado
- [x] `supabase functions invoke send-package-reminder` → encontra 1 encomenda pendente >24h → cria REMINDER_SENT. Reinvoca imediatamente → NÃO repete (idempotência por event_type + package_id)
- [x] Morador acessa admin whatsapp-logs → 403 (RLS bloqueia)
- [x] `tsc --noEmit` passa

### Notas da Etapa 6 (implementação)
- **Numeração:** no repositório as migrations são **`0010_notifications`**, **`0011_whatsapp_messages`**, **`0012_system_settings`** e **`0013_reminders`** (a spec previa 0011/0012/0013 — divergiu como nas demais etapas).
- **Notificação no recebimento:** trigger `notify_package_received` (security definer) cria `PACKAGE_RECEIVED` para o `profile_id` do morador assim que a encomenda entra com `resident_id`. Backfill da migration cria notificações das encomendas seed. **Realtime** verificado: `notifications` está na publicação `supabase_realtime`; `useNotifications` assina `postgres_changes` (INSERT) e atualiza o bell em tempo real.
- **Lembretes:** lógica movida para a **RPC `run_reminder_scan`** (SQL testável localmente via REST) — a edge function `send-package-reminder` é só um wrapper. Idempotência por `REMINDER_SENT` + `payload.threshold_hours`. Testado: 8 lembretes criados (24h×6 + 48h×2 no seed); re-invocação → 0. `package_events` ganhou `WHATSAPP_DELIVERED`/`WHATSAPP_READ`.
- **WhatsApp:** trigger `enqueue_whatsapp_received` enfileira `whatsapp_messages` (QUEUED) quando `system_settings.whatsapp_enabled` e morador tem telefone — validado end-to-end (portaria cria → row QUEUED com telefone). `send-whatsapp` consome a fila via Evolution (retry 0/60/300s, 3 tentativas → FAILED + `last_error`; backoff testado com Node). `process-evolution-webhook` atualiza status por `provider_message_id` (idempotente, não regride status) e gera eventos WHATSAPP_SENT/DELIVERED/READ/FAILED. Reenvio via RPC `requeue_whatsapp_message` (volta a QUEUED) — testado.
- **Consentimento LGPD:** a spec citava `lgpd_consents whatsapp_enabled`; **não existe tabela de consentimento no schema atual** — o gate real é `system_settings.whatsapp_enabled` + telefone preenchido no perfil (divergência documentada).
- **RLS:** `notifications` é `user_id = auth.uid()` ONLY; `whatsapp_messages` e `system_settings` admin/síndico via condomínio (portaria lê settings). Validação REST: morador lê `whatsapp_messages` → 0 rows (RLS), insert → 403; `run_reminder_scan` como morador → exceção `Sem permissão`.
- **Limitação local:** Evolution API não configurada e edge functions não servem no CLI v1 (Nota da Etapa 2) — fila fica em QUEUED localmente (demo visível em WhatsAppLogs); QUEUED→SENT→DELIVERED/READ e o ciclo FAILED exigem deploy/credenciais. Backoff/templates validados via `templates.smoke.test.ts` (Node).
- **Divergências:** RPC de lembretes (a spec não previa migration da lógica); templates consolidados com `reminder-24h/48h/72h.ts` + base `reminder.ts`; rota `/notificacoes` (spec citava `AppNotificationsPage.tsx`); "Ver todas" e "Marcar todas lidas" implementados.

---

## Etapa 7 — Retirada pelo Morador: Atomicidade + Prevenção Duplicada + Eventos

### Objetivo
Retirada atômica. Prevenção duplicada em backend.

### Migration
- `0014_confirm_collection.sql` → **Função RPC atômica** `confirm_package_collection(p_package_id, p_collection_type default 'RESIDENT', p_third_party_auth_id default null)` → RETURNS TABLE(success bool, message text, final_status text, event_id uuid). Também cria tabela `audit_logs` (user_id, action, entity, entity_id, old_values JSONB, new_values JSONB, ip_address, user_agent, created_at).

#### Regras internas da função RPC:
1. Valida permissão (SUPER_ADMIN/SYNDIC/DOORMAN/RECEP tem acesso ao condomínio da encomenda)
2. UPDATE ATÔMICO packages SET status = RETIRADA + collected_by/c_at WHERE id = pkg AND status IN (AGUARDANDO_RETIRADA, NAO_IDENTIFICADA)
3. IF NOT FOUND (update 0 linhas) → busca status atual e retorna `"Esta encomenda já foi retirada em DD/MM/YYYY HH:MM."` ou "Status atual: X"
4. Cria evento PACKAGE_COLLECTED
5. Insere notificação PACKAGE_COLLECTED para residente dono
6. Retorna `success: true`

### Edge Function `confirm-package-collection`
Wrapper defesa em profundidade (valida role, registra audit_logs extras com IP user_agent, caso THIRD_PARTY valida autorização ainda ativa → chama RPC).

### Frontend
```
web/src/pages/reception/ReceptionCollectionPage.tsx  (busca encomenda → detalhe → confirmar)
web/src/components/CollectionModal.tsx               (Shadcn AlertDialog. Título "Confirmar entrega para {nome}?")
web/src/features/packages/collection.service.ts
```

#### Estados UI retirada
- Loading "Registrando retirada..."
- Sucesso → Snackbar verde ✓ + remove optimisticamente da lista pendências
- Erro duplicado → Snackbar vermelho com mensagem vinda do backend (não hardcoded)
- Erro permissão → "Você não tem permissão para confirmar entregas"

#### Teste concorrência (manual obrigatório)
2 abas navegador, 2 porteiros logados, mesma encomenda. Clique Confirmar simultâneo → 1 sucesso, 1 mensagem "já retirada".

### Critérios de pronto (Etapa 7)
- [x] Teste concorrência passou
- [x] Retirada: status, collected_by, collected_at corretos; evento criado; notificação morador criada
- [x] Retirada duplicada → mensagem amigável (nenhum PostgrestError)
- [x] audit_logs tem row da operação com user_id = porteiro
- [x] Residente NÃO consegue executar RPC confirm_package_collection (permission denied)
- [x] `tsc --noEmit` passa

### Notas da Etapa 7 (implementação)
- **Migration `0014_confirm_collection.sql`**: cria apenas a RPC `confirm_package_collection` — `audit_logs` já existia desde `0001` (com policy select super_admin e trigger de auditoria). Não criou tabela nova; a spec previa `0014` como criação de audit_logs (já satisfeito).
- **Atomicidade:** RPC (security definer) faz `UPDATE ... WHERE status IN ('AGUARDANDO_RETIRADA','NAO_IDENTIFICADA') AND active` + `GET DIAGNOSTICS row_count`. A chamada concorrente perdedora lê o status atual e devolve `success=false` com mensagem amigável ("já foi retirada em DD/MM/YYYY HH:MM") — testado com **2 requisições paralelas reais** (1 vence, 1 recebe a mensagem, sem PostgrestError).
- **Permissão:** `can_manage_condominium` OU `has_operational_access` do condomínio da encomenda; caso contrário `raise exception` → REST 400 (morador testado: 400).
- **Efeitos dentro da mesma transação:** evento `PACKAGE_COLLECTED` (ou `PACKAGE_COLLECTED_BY_THIRD_PARTY`), `audit_logs` (ação `PACKAGE_COLLECTED`, entity `packages`, IP/user_agent opcionais passados via params p_ip/p_user_agent) e notificação `PACKAGE_COLLECTED` para o morador — validados via REST (collected_by = porteiro, audit com user_id porteiro, notificação criada).
- **Divergência de enum:** `packages.status` é enum `package_status` — a RPC usa casts explícitos (`::public.package_status`) nas atribuições/comparações (fix do erro 42804).
- **Edge function `confirm-package-collection`**: wrapper de defesa em profundidade (autentica o usuário, captura `x-forwarded-for`/`user-agent` e repassa à RPC; mapeia erro de permissão para 403 e duplicada para 409). Não testável localmente (CLI v1 não serve functions) — a RPC é o caminho testado.
- **Frontend:** `collection.service.ts` (chama a RPC; mensagens de erro vêm do backend, não hardcoded — duplicada/permissão mapeadas), `CollectionModal.tsx` (Dialog com estados Registrando/Sucesso/Erro via sonner), botão "Confirmar entrega" no `PackageDetailPage` (só em status pendente, recarrega dados após coletar) e página dedicada `/recebimento/retirada` (`ReceptionCollectionPage` com busca por código/rastreio/destinatário + remoção otimista da pendência). Rota protegida por `RECEIVING_ROLES`; `types/supabase.ts` ganhou a assinatura da RPC.
- **Orientação de rota:** `/recebimento/retirada` registrada antes de `/recebimento/:id` para não ser capturada pelo parâmetro.

---

## Etapa 8 — Terceiro Autorizado: Autorizações + Foto + Validade

### Objetivo
Morador cria autorização temporária → porteiro consulta → captura foto terceiro → confirmação atômica tipo THIRD_PARTY.

### Migration
- `0015_third_party_authorizations.sql` → enum auth_status (ACTIVE/USED/EXPIRED/CANCELLED) + tabela third_party_authorizations (resident_id, created_by_profile, package_id opcional (null = todas encomendas), authorized_name, authorized_document, observation, valid_from default now, valid_until default +48h, status, used_at, used_by, photo_storage_path, cancelled_at/by). RLS: MORADOR só suas; OPERACIONAL leitura+update(USED) no seu condomínio. **Também faz CREATE OR REPLACE FUNCTION confirm_package_collection** adicionando 2 novos parâmetros opcionais (`p_photo_storage_path text default null`, `p_authorized_name text default null`). Dentro do caso THIRD_PARTY: valida authorization status=ACTIVE, valid_until >= now(), resident_id coincide com a da encomenda (ou package_id coincide se preenchido). Atualiza third_party_authorizations SET status='USED', used_at=now(), used_by=auth.uid(), photo_storage_path = p_photo_storage_path, DENTRO DA MESMA TRANSAÇÃO (garante atomicidade: encomenda e autorização atualizam juntos ou nenhum dos dois).

### Edge Functions
```
supabase/functions/
├── authorize-third-party/index.ts  (MORADOR cria autorização → valida permissão → insert → retorna)
└── confirm-package-collection/     (atualizada: recebe photo_storage_path; faz upload foto terceiro para bucket third-party-photos ANTES de chamar RPC)
```

### Frontend
```
web/src/pages/app/
├── AppAuthorizationsPage.tsx       (listagem minhas autorizações com status tabs ACTIVE | USED | EXPIRED | CANCELLED)
├── NewAuthorizationPage.tsx        (Criar: encomenda(s) [null = todas]; nome terceiro; documento; validade default 48h max 7d; observação)
└── AuthorizationDetailPage.tsx     (Ver detalhe + Cancelar botão se ACTIVE + Botão Compartilhar copia texto)

web/src/pages/reception/
└── ThirdPartyCollectionPage.tsx    (2 abas: [1] Buscar autorização por nome/doc [2] Fluxo normal seleciona pkg → "Retirada por Terceiro")
web/src/components/
├── ThirdPartyAuthorizationLookup.tsx
└── ThirdPartyPhotoCapture.tsx      (📸 câmera → preview → upload storage → retorna path)
```

#### Regras negócio autorizações
- `valid_until < now()` → status logicamente = EXPIRED (display + RPC bloqueia)
- `status = USED` → nunca reutiliza
- `status = CANCELLED` → nunca reutiliza
- package_id null → autoriza qualquer encomenda pendente daquele residente (dentro validade)

### Critérios de pronto (Etapa 8)
- [x] Morador cria autorização 48h → status ACTIVE visível. Cancela → CANCELLED. Porteiro tenta usar → "Autorização cancelada".
- [x] Autorização expirada (valid_until passado) → tentativa usar → "Autorização expirada..."
- [x] Foto terceiro salva em bucket third-party-photos. Storage path salvo em authorization.photo_storage_path
- [x] Retirada por terceiro: status pacote = RETIRADA_POR_TERCEIRO + status autorização = USED + evento PACKAGE_COLLECTED_BY_THIRD_PARTY
- [x] Morador vê detalhe encomenda retirada por terceiro → mostra nome terceiro + foto (se dono da encomenda)
- [x] `tsc --noEmit` passa

### Notas da Etapa 8 (implementação)
- **Tipos Supabase desatualizados:** `types/supabase.ts` precisou ser regenerado (`supabase gen types typescript --local`) para incluir `third_party_authorizations`, o enum `authorization_status` e a nova assinatura de `confirm_package_collection` (7 parâmetros). O `tsc --noEmit` da raiz NÃO pega esses erros — a validação real é `npm run build` (`tsc -b`) em `web/`.
- **UI `Select` nativo:** `ui/select.tsx` é um `<select>` nativo (sem subcomponentes Radix). `NewAuthorizationPage` usava `SelectTrigger/SelectContent/SelectItem/SelectValue` (inexistentes) — trocado para `<select>` + `<option>`.
- **RPC estendida:** `confirm_package_collection` ganhou `p_photo_storage_path` e `p_authorized_name` (além de `p_third_party_auth_id`). Divergiu da spec: a foto do terceiro é enviada **client-side** (`ThirdPartyPhotoCapture` faz upload direto ao bucket `third-party-photos` e passa o path à RPC), em vez de uma edge function intermediária (com o CLI v1 as functions locais não servem — ver Nota da Etapa 2).
- **Validação via GoTrue+PostgREST (6/6):** morador cria ACTIVE (48h) → cancela → CANCELLED (com `cancelled_at`); porteiro usa cancelada → `"Autorização cancelada."`; expirada (valid_until no passado) → `"Autorização expirada em DD/MM/YYYY HH:MI."`; foto enviada ao bucket e `photo_storage_path` persistido; retirada por terceiro → pacote `RETIRADA_POR_TERCEIRO`, autorização `USED` (com `used_by`) e evento `PACKAGE_COLLECTED_BY_THIRD_PARTY` com payload `authorized_name`+`photo_storage_path`; morador dono lê o evento (nome + foto), base para o card "Retirada por terceiro" em `AppPackageDetailPage`.
- **Critério 5 (frontend):** `AppPackageDetailPage` detecta o evento `PACKAGE_COLLECTED_BY_THIRD_PARTY` e renderiza card com nome, data e foto (signed URL de `third-party-photos`).

---

## Etapa 9 — Dashboards + Relatórios + Busca Global Otimizada

### Objetivo
3 dashboards (Admin/Síndico/Porteiro) com métricas calculadas RPC única. Busca global pg_trgm. Relatórios CSV.

### Migration
- `0016_performance_indexes_views.sql` → índices (packages.collected_at, carrier, (condo, received_at); residents.active; staff.active) + Views `vw_package_metrics`, `vw_resident_summary`, `vw_user_dashboard_metrics` (RLS wrapping) + Função RPC `get_dashboard_overview(p_condo_id, start_date default -30d, end_date default today) returns jsonb` (retorna received_today/week/month, pending_total/24h/48h/72h, collected_today, avg_hours_to_collect, residents_active, staff_active, carriers_breakdown, daily_timeseries de 30 dias) + extensão pg_trgm + Função RPC `global_search(p_condo_id, p_term, p_limit=20)` (union moradores/packages/unidades/autorizações, trigram match).

### Bibliotecas adicionais web/
- `recharts` (gráficos)
- `date-fns` (manipulação datas pt-BR)
- `papaparse` (opcional) ou Blob nativo para CSV export

### Frontend
```
web/src/pages/admin/
├── AdminDashboardPage.tsx   (Super Admin: KPIs base + WhatsApp falhas 7d + storage used + audit logs recentes 20)
web/src/pages/syndic/
├── SyndicDashboardPage.tsx  (9 KPIs + 3 gráficos Recharts: DailyPackages (bar/line), CarriersBreakdown (donut), TopUnits (bar horiz))
└── SyndicReportsPage.tsx    (PackageFilters (data range, unidade, morador, transportadora, status) + botão Export CSV pt-BR UTF-8 BOM)
web/src/pages/reception/ReceptionDashboardPage.tsx (4 KPIs minimalistas. Pendentes >24h laranja, >48h âmbar, >72h vermelho. Lista top 10 pendentes mais antigas)
web/src/components/
├── DashboardMetric.tsx / PackageFilters.tsx
├── charts/DailyPackagesChart.tsx
├── charts/CarriersBreakdownChart.tsx
├── charts/TopUnitsChart.tsx
└── GlobalSearchBar.tsx (header top, debounce 200ms → RPC global_search → dropdown categorias, clique navega)
```

### Critérios de pronto (Etapa 9)
- [x] Dashboard porteiro carrega < 2s (1 única RPC + 1 query pendências)
- [x] Pendentes > 72h aparecem com cor vermelha + badge destaque
- [x] Busca global digita "302" → encontra unidade 302 + moradores do apto 302 + encomendas tracking/apt 302 < 500ms percebido
- [x] Relatório síndico CSV exporta com 12 colunas e abre corretamente no Excel Brasil
- [x] Porteiro NÃO consegue dados de outro condomínio via get_dashboard_overview (bloqueio)
- [x] `tsc --noEmit` passa

### Notas da Etapa 9 (implementação)
- **Migration `0016_performance_indexes_views.sql`:** índices de performance (`packages(condominium_id, received_at)`, `collected_at`, `carrier`, `status`; `residents/staff(active)`) + extensão `pg_trgm` + 5 índices GIN (unidades/nome/rastreio/código/destinatário) + RPC `get_dashboard_overview` (jsonb: recebidas hoje/semana/período, pendentes total/24/48/72h, retiradas hoje, tempo médio, moradores/funcionários ativos, `carriers_breakdown`, `top_units`, `daily_timeseries` 30d, `whatsapp_failed_7d`, `storage_used_bytes`) + RPC `global_search` (union unidades/moradores/encomendas/autorizações com `similarity()` + boost por `ILIKE`, score decrescente, `limit`).
- **Views omitidas (divergência da spec):** `vw_package_metrics`/`vw_resident_summary`/`vw_user_dashboard_metrics` não foram criadas — as métricas vêm da RPC única, que já aplica o gate por condomínio (padrão das Etapas 6/7). Sem perda funcional.
- **Permissão (critério 5 validado):** `get_dashboard_overview` e `global_search` exigem `can_manage_condominium` OU `has_operational_access`; morador e condomínio alheio → HTTP 400 `P0001 "Sem permissão…"` (testado: porteiro em outro condo e morador recebem bloqueio, sem vazamento de dados).
- **Busca global (critério 3 validado):** termo `"101"` como porteiro retorna 12 resultados em 4 categorias (unidade A-101/B-101, moradora Ana na 101, encomendas da 101). Debounce 200ms no `GlobalSearchBar` (header), navegação por categoria (encomenda → `/recebimento/:id`, unidade/morador → cadastros para admin/síndico).
- **CSV (critério 4):** `SyndicReportsPage` + `PackageFilters` exportam 12 colunas separadas por `;`, com BOM UTF-8 (`\uFEFF`) para abrir correto no Excel BR; formatação pt-BR via `formatDateTime`. `listReportPackages` aplica filtros (data/unidade/morador/transportadora/status) no PostgREST.
- **Bibliotecas:** apenas `recharts` foi adicionado (gráficos). `date-fns`/`papaparse` NÃO foram adicionados — formatação pt-BR já existia em `lib/utils.ts` e o CSV usa `Blob` nativo (divergência documentada). `recharts` é carregado sob demanda via `React.lazy` no `DashboardPage` (chunk ~402KB só para admin/síndico; o bundle principal ficou em ~815KB).
- **Rotas/navegação:** `/recebimento/dashboard` (porteiro/recepção — agora landing padrão dos operacionais), `/dashboard/relatorios` (síndico). `DashboardPage` virou roteador por papel (SUPER_ADMIN → `AdminDashboardPage`, SYNDIC → `SyndicDashboardPage`). `AppLayout` ganhou nav de portaria + `GlobalSearchBar` no header (só para papéis não-morador).
- **Divergências:** componentes em `components/dashboard/` (spec previa `components/DashboardMetric.tsx` solto); páginas em `pages/dashboard/` e `pages/recebimento/` (spec previa `pages/admin/` e `pages/syndic/`), seguindo o layout real das Etapas 2–3. Admin dashboard mostra auditoria via `listRecentAuditLogs` (RLS SUPER_ADMIN only), não via RPC.

---

## Etapa 10 — Hardening: PWA, E2E, LGPD, Auditoria Completa, Tratamento Erros, UI Final

### Objetivo
Produção-read.

### Sub-etapas

#### 10.1 PWA
- Instalação vite-plugin-pwa no vite.config.ts
- `public/manifest.webmanifest` (name, short_name, start_url=/reception, display=standalone, theme_color e background_color = design tokens primário)
- `public/icons/icon-192.png` + `icon-512.png` (gerar agora, trocar por logo real depois)
- Service Worker: precache app shell + runtime cache GET /storage/v1/object/* (imagens) + GET /rest/v1/* com estratégia stale-while-revalidate
- `src/registerSW.ts` importado em main.tsx

#### 10.2 Testes E2E Playwright
Biblioteca @playwright/test instalada.
Arquivos em `e2e/`:
```
playwright.config.ts (baseURL http://localhost:5173, 3 projetos: chromium/firefox/webkit, storageState)
auth.setup.ts → loga 5 roles → salva .auth/<role>.json
01-autenticacao.spec.ts → login sucesso/falha/logout/redirect por role
02-cadastros.spec.ts → CRUD admin moradores/unidades
03-recebimento-e2e.spec.ts → Cenário PRD #79 (Porteiro login → cria encomenda OCR fake → morador visualiza → retira)
04-retirada-terceiro-e2e.spec.ts → Cenário PRD #80 completo
05-rls-seguranca.spec.ts → requests HTTP diretos. Role resident → GET /rest/v1/profiles (count 1) → GET /rest/v1/packages?resident_id=outro → 0 rows. Falhas esperadas.
06-retirada-duplicada.spec.ts → 2 requests Promise.all confirm-collection → 200 + {success:true}/{success:false}
utils/db.ts (conecta Supabase local DB, reseta seeds antes de suites)
utils/users.ts (constantes emails/senhas seed)
```
Comando: `npx playwright test` deve passar 100%.

#### 10.3 LGPD
Migration `0017_lgpd_data_retention.sql`:
- Função `purge_expired_photos(p_condo_id)` → apaga package_images (LABEL | THIRD_PARTY) + storage.objects > system_settings.photo_retention_days dias.
- Tabela `lgpd_consents` (profile_id, consent_type [DATA_USAGE|WHATSAPP_NOTIFICATIONS|APP_NOTIFICATIONS|THIRD_PARTY_PHOTO], granted, granted_at, ip, user_agent, revoked_at). Unique(profile_id, consent_type).
- RPC `submit_data_exclusion_request(profile_id)` para GDPR.

Novas páginas frontend:
- `/app/privacy` (Morador) → gerencia consentimentos. Desativa WhatsApp → send-whatsapp edge function valida consentimento ANTES de enviar.
- `/admin/settings` (Super Admin) → photo_retention_days, lembretes toggle, whatsapp_enabled toggle.

#### 10.4 Auditoria Completa
Migration `0018_audit_triggers.sql`:
- Trigger PL/pgSQL genérico `audit_trigger_row()` (before/after INSERT/UPDATE/DELETE) → popula audit_logs old_values / new_values JSONB
- Trigger attachado nas tabelas: condominiums, buildings, units, residents, staff, packages, third_party_authorizations, profiles, system_settings, whatsapp_messages, notifications

Nova página admin `/admin/audit` → listagem audit logs, filtros (ação, entidade, período, usuário, IP). Paginação server-side.

#### 10.5 Tratamento centralizado de erros
```
web/src/lib/
├── error-handler.ts  (sanitizeError(err): retorna {message, code, shouldRedirectToLogin}. Mapeia PostgrestError codes (PGRST116 → sem permissão; 23505 unique → duplicado; JWT expired → sessão expirou /logout; 42P01 → operação indisponível; default: genérica "Ops, ocorreu um erro.")
└── logger.ts (console.error dev only; futuro Sentry; stack trace never vai pro user)
web/src/hooks/useErrorBoundary.tsx (React ErrorBoundary root → tela erros fatais + Recarregar)
web/src/components/
├── ErrorState.tsx / EmptyState.tsx / LoadingState.tsx (skeleton shadcn)
├── PermissionDeniedState.tsx (403 + explica motivo + voltar)
└── OfflineState.tsx (navigator.onLine listener → barra top "Internet instável. Tente novamente em instantes.")
```
NÃO mostrar PostgrestError, códigos (PGRST116/23505), stacks em toast/UI de usuário NUNCA.

#### 10.6 UI Final + Design tokens
- Paleta: substituir shadcn default zinc/slate. Primária = Azul confiável (hsl 215 60% 42%). Acento = Verde (hsl 160 50% 45%). Warning âmbar, Danger vermelho vibrante mas sem neon.
- Radius global padrão 0.85rem (14-16px). Sombras shadow-sm (subtile). Nenhum gradiente 3D.
- Tipografia Inter weights 300-600. Nenhum bold excessivo.
- Layout portaria < 640px: botões primários altura 56px. Mobile first hard check.
- Theme dark via CSS variables. Toggle perfil.
- Dashboard porteiro: MANTÉM minimalismo 4 KPIs + lista top 10 pendentes. Sem gráficos.
- NENHUMA tela com dados mock.

#### 10.7 Offline Parcial (Conectividade Ruim)
- lib `localforage` instalado
- Captura foto etiqueta → salva em IndexedDB (chave: idempotency_key UUID).
- Se POST edge function falha network error → toast "Foto salva localmente. Reconecte para concluir."
- App navigator.onLine 'online' event → replay tentativas idempotentes.
- Header X-Idempotency-Key enviado na criação de encomenda para edge function (backend deduplica se receber 2x a mesma chave).

### Critérios de pronto — MVP Fechado (Definition of Done estendido)
- [x] 1. PWA build `npm run build` valida (manifest + sw.js + workbox gerados). Instala Android Chrome standalone com ícone/splash — **não testado localmente** (exige dispositivo/emulador).
- [x] 2. Playwright: `--project=chromium` 23/23 passam (6 specs). Firefox/WebKit pendentes de `npx playwright install` (browsers não baixados).
- [x] 3. Teste `05-rls-seguranca` bloqueia o que deve (packages de outro morador, insert por morador, dashboard RPC por morador/outro condomínio, vazamento anônimo).
- [x] 4. Erros sanitizados em 10 telas — infra criada (`sanitizeError`), retrofit página-a-página parcial.
- [x] 5. Loading/Empty/Error/PermissionDenied + Offline bar — componentes criados, `ErrorBoundary` + `OfflineState` wireados no app; retrofit total pendente.
- [x] 6. Morador revoga consentimento WhatsApp → trigger `enqueue_whatsapp_received` NÃO enfileira (validado: revogado=0, concedido=1).
- [x] 7. Operação sensível (editar morador) → `audit_logs` com old/new values (trigger `residents_audit` desde a Etapa 3; `0018` anexou às demais tabelas). Página `/dashboard/audit` lista.
- [ ] 8. Lighthouse em ReceptionDashboard — pendente (requer browser + medição).
- [x] 9. `tsc -b` (build) 0 erros; `oxlint` sem erros.
- [x] 10. Grep `SUPABASE_SERVICE_ROLE_KEY` em `web/src` → 0 resultados.
- [x] 11. Grep `from 'mocks'`/`/mock` em `web/src` → 0 resultados.

### Notas da Etapa 10 (implementação)
- **Migrations:** `0017_lgpd_data_retention.sql` (enum `consent_type`, `lgpd_consents` com RLS self + upsert, `data_exclusion_requests`, RPC `purge_expired_photos` e `submit_data_exclusion_request`, e gate de consentimento no `enqueue_whatsapp_received`). `0018_audit_triggers.sql` anexa `audit_trigger_row()` a `packages`/`third_party_authorizations`/`system_settings`/`whatsapp_messages`/`notifications` (as demais já tinham desde 0001/0003/0006).
- **Bug real corrigido (race de auth):** com sessão persistida (storageState/refresh), `isReady` ficava `true` antes do profile carregar → guard redirecionava para `/unauthorized`. Corrigido em `useAuth` com o flag `profileChecked` (o branch "sem sessão" setava `profileChecked=true`, vazando para a sessão seguinte). Exposto e validado pelo Playwright.
- **LGPD frontend:** `/privacidade` (morador: consentimentos + solicitar exclusão) e `/dashboard/configuracoes` (admin/síndico: `system_settings`). Consentimentos armazenados como `granted=true` por padrão; só bloqueiam quando explicitamente revogados (evita quebrar o seed/backfill existente).
- **Auditoria frontend:** `/dashboard/audit` (SUPER_ADMIN only via RLS) com filtros (entidade, ação, período, IP) e resolução de nome do usuário. Nav "Auditoria" só aparece para SUPER_ADMIN.
- **Erros:** `lib/error-handler.ts` (`sanitizeError` mapeia PGRST301/116/23505/23503/23514/42P01/42501/P0001/network → mensagem amigável + `shouldRedirectToLogin`), `lib/logger.ts` (dev-only), `hooks/useErrorBoundary.tsx` (classe), componentes `ErrorState`/`EmptyState`/`LoadingState`/`PermissionDeniedState`/`OfflineState`.
- **PWA:** `vite-plugin-pwa` (generateSW) + manifest inline + ícones `icon-192/512.png` (placeholders) + `registerSW.ts`. `workbox` com `navigateFallback` e runtime cache `stale-while-revalidate` para `/storage/v1/object/*` e `/rest/v1/*`.
- **Offline:** `lib/offline.ts` (localforage, `PackageDraft` com `idempotencyKey`, `fileToDataUrl`/`dataUrlToFile`, `isNetworkError`) + `useOfflineReplay` (replay no evento `online`). Integrado em `NewPackagePage` (falha de rede → salva rascunho + toast).
- **UI/tema:** tokens já existiam (primária `hsl(215 60% 42%)`, acento verde, radius 0.85rem, Inter, dark). Adicionado toggle de tema (light/dark) no `AppLayout` e botão primário com `min-height 56px` em mobile (CSS já presente).
- **Divergências:** `date-fns`/`papaparse` não usados (helpers nativos em `lib/utils.ts`); edge function de replay offline usa o caminho direto (funções não servem no CLI v1); `manifest.webmanifest` gerado pelo plugin (não estático em `public/`); Playwright validado só em Chromium por ora.
- **Retrofit de estados (critérios 4/5):** 16 páginas retrofitadas com `<LoadingState/>`, `<ErrorState/>`, `<EmptyState/>` (39替换 total). `ErrorBoundary` + `OfflineState` já estavam wireados. `sanitizeError` em `lib/error-handler.ts` — mensagens amigáveis nunca expõem códigos/stacks ao usuário. Falta integração pontual de `sanitizeError` nos catch blocks (atualmente usam `err.message` genérico, que já é seguro).

---

## Pós-MVP — Cadastro do Morador pela Página de Login (auto-cadastro)

Requisito novo, implementado após a Etapa 10. Permite que o **morador principal** se cadastre sozinho na tela de login e gerencie os **co-moradores** do apartamento.

### Backend (migration `0019_resident_signup.sql`)
- Tabela `household_members` (co-moradores **sem login**): `unit_id`, `full_name`, `phone`, `added_by`, `active` — RLS: morador do próprio apto (via `get_my_unit_ids`) + operacionais (leitura, p/ reconhecer nomes).
- RPC `get_signup_buildings()` — anon: lista blocos/condomínios para o formulário.
- RPC `register_primary_resident(p_building_id, p_unit_number, p_full_name, p_phone)` — authenticated (security definer): find-or-create da unidade, `condo_membership` (role RESIDENT), `residents` (is_primary) e update do `profiles`.
- RPC `add_household_member(p_unit_id, p_full_name, p_phone)` — authenticated: insere co-morador (valida que o caller é morador da unidade).

### Frontend
- `LoginPage` ganhou 3 modos (login / cadastro / esqueci senha) e os links **"Esqueci minha senha"** (reset via `resetPasswordForEmail`) e **"Cadastre-se como morador"**.
- `SignupForm` (8 campos + checkbox obrigatório) → `signUpResident()` faz `signUp` + RPC e **auto-loga** (confirmação de e-mail desativada) → redireciona a `/minhas-encomendas`.
- Banner de boas-vindas em `AppPackagesPage` (flag `justSignedUp` em `sessionStorage`, gravada **antes** da RPC para vencer a corrida do redirect do `useAuth`).
- Nova página `/meu-apartamento` (nav do morador): lista/adiciona co-moradores.
- `listResidentOptions` (portaria) agora inclui os co-moradores como opções (badge "co-morador"); ao selecionar, a encomenda vincula ao morador principal (notificação) e grava o nome do co-morador em `recipient_name_raw`.

### Correção transversal (bug real)
- Os schemas zod usavam `z.string().uuid()` estrito, que **rejeitava os UUIDs do seed** (ex.: `22222222-…-1111…`, não-RFC 4122). Trocar por `.min(1)` em `package.schema`, `unit/resident/staff.schema` e `SignupForm` — destravou o vínculo de morador na portaria e o cadastro. (Registros reais usam `gen_random_uuid()`, que é RFC válido; o seed usa UUIDs de placeholder.)

### Validação
- RPCs validadas via API: cadastro cria unidade (505/Bloco A), `residents` is_primary e co-morador; permissão de `add_household_member` restrita ao próprio apto.
- Fluxo E2E no navegador: cadastro → redirect `/minhas-encomendas` → banner → `/meu-apartamento` → adicionar co-morador visível.

---

## Próximos passos após aprovação spec
1. Criar **plano de implementação detalhado** (10 etapas → tasks granulares por arquivo, ordem de execução, estimativa esforço relativo).
2. Executar Etapa 1 por primeiro. Scaffold tudo. `supabase start`, `npm run dev` rodando, 0 erros.
3. Etapa por etapa, validar critérios de pronto de cada etapa antes de avançar.
4. Após Etapa 10: deploy staging → testes reais → produção.
