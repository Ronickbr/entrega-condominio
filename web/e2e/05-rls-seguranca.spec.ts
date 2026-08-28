import { test, expect } from '@playwright/test'
import { loginViaApi, restHeaders, SUPABASE_URL, CONDO_ID } from './utils/users'

test('residente NÃO vê logs de auditoria (RLS super_admin only)', async ({ request }) => {
  const token = await loginViaApi(request, 'ana@condominio.dev', 'morador1')
  const res = await request.get(`${SUPABASE_URL}/rest/v1/audit_logs?select=id`, {
    headers: restHeaders(token),
  })
  expect(res.ok()).toBeTruthy()
  expect(((await res.json()) as unknown[])).toHaveLength(0)
})

test('residente NÃO vê encomendas de outro morador (RLS)', async ({ request }) => {
  const token = await loginViaApi(request, 'ana@condominio.dev', 'morador1')
  const res = await request.get(
    `${SUPABASE_URL}/rest/v1/packages?select=id&resident_id=eq.66666666-6666-6666-6666-666666666602`,
    { headers: restHeaders(token) },
  )
  expect(res.ok()).toBeTruthy()
  expect(((await res.json()) as unknown[])).toHaveLength(0)
})

test('residente NÃO consegue inserir encomenda (RLS)', async ({ request }) => {
  const token = await loginViaApi(request, 'ana@condominio.dev', 'morador1')
  const res = await request.post(`${SUPABASE_URL}/rest/v1/packages`, {
    headers: restHeaders(token),
    data: { condominium_id: CONDO_ID, resident_id: '66666666-6666-6666-6666-666666666601' },
  })
  expect(res.status()).toBeGreaterThanOrEqual(400)
})

test('portaria consegue listar encomendas do condomínio', async ({ request }) => {
  const token = await loginViaApi(request, 'porteiro@condominio.dev', 'porteiro')
  const res = await request.get(`${SUPABASE_URL}/rest/v1/packages?select=id`, {
    headers: restHeaders(token),
  })
  expect(res.ok()).toBeTruthy()
  expect(((await res.json()) as unknown[]).length).toBeGreaterThan(0)
})

test('residente NÃO acessa dashboard (RPC bloqueada)', async ({ request }) => {
  const token = await loginViaApi(request, 'ana@condominio.dev', 'morador1')
  const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/get_dashboard_overview`, {
    headers: restHeaders(token),
    data: { p_condominium_id: CONDO_ID },
  })
  expect(res.status()).toBeGreaterThanOrEqual(400)
})

test('portaria NÃO acessa dashboard de outro condomínio', async ({ request }) => {
  const token = await loginViaApi(request, 'porteiro@condominio.dev', 'porteiro')
  const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/get_dashboard_overview`, {
    headers: restHeaders(token),
    data: { p_condominium_id: '00000000-0000-0000-0000-000000000000' },
  })
  expect(res.status()).toBeGreaterThanOrEqual(400)
})

test('sem autenticação, PostgREST não vaza dados (RLS)', async ({ request }) => {
  const res = await request.get(`${SUPABASE_URL}/rest/v1/profiles?select=id`)
  expect(res.ok()).toBeTruthy()
  expect(((await res.json()) as unknown[])).toHaveLength(0)
})
