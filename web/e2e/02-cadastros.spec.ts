import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/super_admin.json' })

test('admin vê lista de moradores com dados do seed', async ({ page }) => {
  await page.goto('/dashboard/moradores')
  await expect(page.getByText('Ana Souza').first()).toBeVisible()
})

test('admin vê lista de unidades', async ({ page }) => {
  await page.goto('/dashboard/unidades')
  await expect(page.getByText('101').first()).toBeVisible()
})

test('admin acessa relatórios', async ({ page }) => {
  await page.goto('/dashboard/relatorios')
  await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible()
})
