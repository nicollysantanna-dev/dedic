import { expect, test } from './fixtures'

test('usuário cria conta, exclui e não consegue mais entrar', async ({
  page,
}, testInfo) => {
  const email = `excluir-${Date.now()}-${testInfo.project.name}@dedic.local`
  const password = 'dedic-local-2026'

  await page.goto('/cadastro')
  await page.getByLabel('Nome completo').fill('Conta Descartável')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/app/)

  await page.goto('/app/conta')
  await page.getByRole('button', { name: 'Excluir conta' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR')
  await dialog.getByRole('button', { name: 'Excluir conta' }).click()

  await expect(page).toHaveURL('/?conta=excluida')
  await expect(
    page.getByRole('status').filter({ hasText: 'Sua conta foi excluída.' }),
  ).toBeVisible()

  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByText('Não foi possível entrar. Confira seu e-mail e senha.'),
  ).toBeVisible()
  await expect(page).not.toHaveURL(/\/app/)
})
