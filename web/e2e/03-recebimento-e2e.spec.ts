import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/doorman.json' })

test('porteiro cadastra encomenda não identificada e vê na pendência', async ({ page }) => {
  await page.goto('/recebimento/novo')
  await page.getByPlaceholder('Nome impresso na etiqueta').fill('Entrega E2E Automatizada')
  await page.getByPlaceholder('Ex.: Correios').fill('Correios')
  await page.getByRole('button', { name: 'Confirmar recebimento' }).click()
  await expect(page).toHaveURL(/recebimento(\/)?$/)

  await page.goto('/recebimento')
  await expect(page.getByText('Entrega E2E Automatizada').first()).toBeVisible()
})
