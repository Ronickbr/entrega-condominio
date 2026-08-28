import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/resident.json' })

test('moradora cria autorização de retirada por terceiro', async ({ page }) => {
  await page.goto('/minhas-autorizacoes/novo')
  await page.locator('#name').fill('João Entrega E2E')
  await page.getByRole('button', { name: 'Criar autorização' }).click()
  await expect(page).toHaveURL(/minhas-autorizacoes\/[0-9a-f-]+/)
})

test('moradora acessa a página de privacidade', async ({ page }) => {
  await page.goto('/privacidade')
  await expect(page.getByText('Consentimentos', { exact: true })).toBeVisible()
})
