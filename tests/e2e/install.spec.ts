import { expect, test } from './fixtures'
import { login, users } from './helpers'

const cardTitle = { name: 'Instale o Dedic no seu celular' }

test('celular vê o convite de instalação e pode dispensá-lo', async ({
  page,
  isMobile,
}) => {
  await login(page, users.student.email)
  await page.goto('/app')

  if (!isMobile) {
    await expect(page.getByRole('heading', { name: /Olá/ })).toBeVisible()
    await expect(page.getByRole('heading', cardTitle)).toHaveCount(0)
    return
  }

  await expect(page.getByRole('heading', cardTitle)).toBeVisible()
  await expect(
    page.getByText('No Chrome, toque em ⋮ e depois em Instalar app.'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Agora não' }).click()
  await expect(page.getByRole('heading', cardTitle)).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('heading', { name: /Olá/ })).toBeVisible()
  await expect(page.getByRole('heading', cardTitle)).toHaveCount(0)
})
