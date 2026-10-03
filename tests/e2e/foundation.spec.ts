import { expect, test } from './fixtures'

test('serve os headers de segurança da Vercel', async ({ request }) => {
  const response = await request.get('/')
  const headers = response.headers()

  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
})

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

test('preserva o convite ao alternar do cadastro para a entrada', async ({ page }) => {
  const token = '8b3d6e56-91c4-4e8f-9ee4-a4d9b0f88961'

  await page.goto(`/cadastro?convite=${token}`)
  await expect(page.getByRole('heading', { name: 'Crie seu espaço.' })).toBeVisible()
  await page.getByRole('link', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(`/?convite=${token}`)
  await expect(
    page.getByRole('heading', { name: 'Que bom ter você de volta.' }),
  ).toBeVisible()
})
