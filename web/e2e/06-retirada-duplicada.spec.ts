import { test, expect } from '@playwright/test'
import { loginViaApi, restHeaders, SUPABASE_URL } from './utils/users'

test('retirada duplicada: exatamente uma vence', async ({ request }) => {
  const token = await loginViaApi(request, 'porteiro@condominio.dev', 'porteiro')

  const listRes = await request.get(
    `${SUPABASE_URL}/rest/v1/packages?select=id&status=in.(AGUARDANDO_RETIRADA,NAO_IDENTIFICADA)&limit=1`,
    { headers: restHeaders(token) },
  )
  const pkgs = (await listRes.json()) as { id: string }[]
  expect(pkgs.length).toBeGreaterThan(0)
  const pkgId = pkgs[0].id

  const call = () =>
    request.post(`${SUPABASE_URL}/rest/v1/rpc/confirm_package_collection`, {
      headers: restHeaders(token),
      data: { p_package_id: pkgId, p_collection_type: 'RESIDENT' },
    })

  const [r1, r2] = await Promise.all([call(), call()])
  expect(r1.ok()).toBeTruthy()
  expect(r2.ok()).toBeTruthy()

  const b1 = (await r1.json()) as { success: boolean; message: string }[]
  const b2 = (await r2.json()) as { success: boolean; message: string }[]
  const successes = [b1[0], b2[0]].filter((r) => r.success).length
  expect(successes).toBe(1)
})
