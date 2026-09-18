import { expect, type Page } from '@playwright/test'

export const users = {
  trainer: { email: 'personal@dedic.local', name: 'Paula' },
  student: { email: 'aluna@dedic.local', name: 'Ana' },
}

const password = 'dedic-local-2026'

export async function login(page: Page, email: string) {
  await page.goto('/')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/app/)
}

export async function logout(page: Page) {
  await page.goto('/app/conta')
  await page.getByRole('main').getByRole('button', { name: 'Sair da conta' }).click()
  await expect(page).toHaveURL('/')
}

/** Data futura (hoje + offset) no formato YYYY-MM-DD, no fuso do navegador. */
export function futureDate(offsetDays: number) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Lê o valor de um cartão de resumo pelo rótulo. */
export async function summaryValue(page: Page, label: string) {
  const card = page
    .locator('article, div')
    .filter({ has: page.getByText(label, { exact: true }) })
  return (await card.last().locator('p').nth(1).innerText()).trim()
}
