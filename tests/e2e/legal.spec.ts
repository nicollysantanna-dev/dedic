import { expect, test } from './fixtures'
import { login, users } from './helpers'

const documents = [
  { path: '/termos', title: 'Termos de uso do Dedic' },
  { path: '/privacidade', title: 'Política de privacidade do Dedic' },
]

test('termos e privacidade abrem sem login', async ({ page }) => {
  for (const doc of documents) {
    await page.goto(doc.path)
    await expect(page.getByRole('heading', { level: 1, name: doc.title })).toBeVisible()
    const overflow = await page
      .locator('html')
      .evaluate((html) => html.scrollWidth - html.clientWidth)
    expect(overflow, `rolagem horizontal em ${doc.path}`).toBeLessThanOrEqual(0)
  }
})

test('link do cadastro abre a política em nova aba', async ({ page, context }) => {
  await page.goto('/cadastro')

  const [policy] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: 'Política de privacidade' }).click(),
  ])

  await expect(policy).toHaveURL(/\/privacidade$/)
  await expect(
    policy.getByRole('heading', { level: 1, name: 'Política de privacidade do Dedic' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/cadastro$/)
})

test('página legal abre com sessão ativa', async ({ page }) => {
  await login(page, users.student.email)

  await page.goto('/privacidade')

  await expect(page).toHaveURL(/\/privacidade$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Política de privacidade do Dedic' }),
  ).toBeVisible()
})
