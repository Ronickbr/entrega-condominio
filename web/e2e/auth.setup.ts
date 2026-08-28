import { test as setup } from '@playwright/test'
import { USERS } from './utils/users'

setup.setTimeout(60_000)

for (const user of USERS) {
  setup(`login ${user.role}`, async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Entrar' }).waitFor({ timeout: 20_000 })
    await page.locator('#email').fill(user.email)
    await page.locator('#password').fill(user.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 20_000 })
    await page.context().storageState({ path: user.storageState })
  })
}
