import { expect, test } from '@playwright/test'

test('carrega a fundação conectada e abre o cadastro', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Bom dia, Nicolly.' })).toBeVisible()
  await page.getByRole('link', { name: 'Começar agora' }).click()
  await expect(page.getByRole('heading', { name: 'Crie seu espaço.' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()
})
