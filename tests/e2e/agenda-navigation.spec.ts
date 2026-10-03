import { type Page } from '@playwright/test'

import { expect, test } from './fixtures'
import { futureDate, login, users } from './helpers'

// Regressão: ao navegar para um período ainda não carregado, a agenda desmontava
// durante a consulta e voltava para a semana atual na visão padrão.

async function calendarTitle(page: Page) {
  return ((await page.locator('.dedic-scheduler h2').textContent()) ?? '').trim()
}

async function goNextAndWaitTitleChange(page: Page) {
  const before = await calendarTitle(page)
  await page.getByRole('button', { name: 'Próximo período' }).click()
  await expect(page.locator('.dedic-scheduler h2')).not.toHaveText(before)
}

async function expectSettled(page: Page) {
  await page.waitForLoadState('networkidle')
  // Margem para um eventual remonte do calendário após a consulta terminar.
  await page.waitForTimeout(500)
}

test('agenda mantém o período e a visão ao avançar para períodos não carregados', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chrome',
    'visão padrão de semana só no desktop',
  )

  await login(page, users.trainer.email)
  await page.goto('/app/agenda')
  await expect(page.locator('.fc-timegrid-slot-lane').first()).toBeVisible()

  const weekButton = page.getByRole('button', { name: 'Semana', exact: true })
  const dayButton = page.getByRole('button', { name: 'Dia', exact: true })
  await expect(weekButton).toHaveAttribute('aria-pressed', 'true')
  const today = futureDate(0)
  await expect(page.locator(`.fc-timegrid-col[data-date="${today}"]`)).toBeVisible()
  const currentWeekTitle = await calendarTitle(page)

  // Semana: duas semanas à frente.
  await goNextAndWaitTitleChange(page)
  await goNextAndWaitTitleChange(page)
  await expectSettled(page)
  await expect(
    page.locator(`.fc-timegrid-col[data-date="${futureDate(14)}"]`),
  ).toBeVisible()
  await expect(page.locator(`.fc-timegrid-col[data-date="${today}"]`)).toHaveCount(0)
  expect(await calendarTitle(page)).not.toBe(currentWeekTitle)
  await expect(weekButton).toHaveAttribute('aria-pressed', 'true')

  // Dia: volta para hoje e avança três dias.
  await page.getByRole('button', { name: 'Hoje', exact: true }).click()
  await expect(page.locator('.dedic-scheduler h2')).toHaveText(currentWeekTitle)
  await dayButton.click()
  await expect(dayButton).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator(`.fc-timegrid-col[data-date="${today}"]`)).toBeVisible()
  for (let index = 0; index < 3; index += 1) {
    await goNextAndWaitTitleChange(page)
  }
  await expectSettled(page)
  await expect(
    page.locator(`.fc-timegrid-col[data-date="${futureDate(3)}"]`),
  ).toBeVisible()
  await expect(page.locator('.fc-timegrid-col[data-date]')).toHaveCount(1)
  await expect(dayButton).toHaveAttribute('aria-pressed', 'true')
})
