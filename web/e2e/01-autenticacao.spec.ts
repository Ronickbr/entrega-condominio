import { test, expect } from '@playwright/test'

test('login sucesso redireciona porteiro para o dashboard da portaria', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#email').fill('porteiro@condominio.dev')
  await page.locator('#password').fill('porteiro')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/recebimento\/dashboard/)
})

test('login sucesso redireciona moradora para minhas encomendas', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#email').fill('ana@condominio.dev')
  await page.locator('#password').fill('morador1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/minhas-encomendas/)
})

test('login com senha errada mostra erro', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#email').fill('porteiro@condominio.dev')
  await page.locator('#password').fill('senha-errada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('Falha no login')).toBeVisible()
})

test('logout volta para o login', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#email').fill('porteiro@condominio.dev')
  await page.locator('#password').fill('porteiro')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/recebimento/)
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/login/)
})
