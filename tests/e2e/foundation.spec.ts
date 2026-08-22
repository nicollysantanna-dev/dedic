import { expect, test } from '@playwright/test'

test('abre o acesso na raiz e permite seguir para o cadastro', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Que bom ter você de volta.' }),
  ).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await page.getByRole('link', { name: 'Criar conta' }).click()
  await expect(page.getByRole('heading', { name: 'Crie seu espaço.' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()
})
