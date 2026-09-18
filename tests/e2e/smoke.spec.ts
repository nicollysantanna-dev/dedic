import { expect, test } from '@playwright/test'

import { login, users } from './helpers'

test('aluna entra e vê a própria página inicial', async ({ page }) => {
  await login(page, users.student.email)
  await expect(page.getByText('Créditos disponíveis')).toBeVisible()
  await expect(page.getByRole('link', { name: /agenda/i }).first()).toBeVisible()
})

test('personal entra e vê a agenda do dia', async ({ page }) => {
  await login(page, users.trainer.email)
  await expect(page.getByRole('heading', { name: /Paula/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nova aula' })).toBeVisible()
})
