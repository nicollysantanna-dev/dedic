import { expect, test, type Page } from '@playwright/test'

import { futureDate, login, logout, users } from './helpers'

// As jornadas dependem umas das outras (saldo, aulas), por isso rodam em série
// sobre o banco semeado pelo global-setup.
test.describe.configure({ mode: 'serial' })

const bookingDay = 2 // dias a partir de hoje, fora da trava de mesmo dia

async function studentCredits(page: Page) {
  await page.goto('/app')
  const card = page.locator('article').filter({ hasText: 'Créditos disponíveis' })
  return Number((await card.locator('p').nth(1).innerText()).trim())
}

/** Clica em um horário da grade do FullCalendar pela posição da faixa correspondente. */
async function clickSlot(page: Page, time: string) {
  const lane = page.locator(`.fc-timegrid-slot-lane[data-time="${time}"]`)
  await lane.scrollIntoViewIfNeeded()
  const box = await lane.boundingBox()
  if (!box) throw new Error(`Faixa ${time} não encontrada`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function openAgendaOnBookingDay(page: Page) {
  await page.goto('/app/agenda')
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  for (let index = 0; index < bookingDay; index += 1) {
    await page.getByRole('button', { name: 'Próximo período' }).click()
  }
  await expect(page.locator('.fc-timegrid-slot-lane[data-time="10:00:00"]')).toBeVisible()
}

test('personal adiciona um pacote e a aluna recebe os créditos', async ({ page }) => {
  await login(page, users.trainer.email)
  await page.goto('/app/alunos')
  await page.getByRole('link', { name: /Ana Aluna/ }).click()

  await page.getByRole('button', { name: 'Adicionar aulas' }).click()
  const dialog = page.getByRole('dialog', { name: 'Adicionar aulas' })
  await dialog.getByLabel('Quantidade de aulas').fill('8')
  await dialog.getByRole('button', { name: 'Adicionar e ativar pacote' }).click()

  await expect(page.getByText('8 aulas adicionadas para Ana Aluna.')).toBeVisible()
  await expect(
    page
      .locator('div')
      .filter({ hasText: /^Créditos18$/ })
      .first(),
  ).toBeVisible()
  await logout(page)

  await login(page, users.student.email)
  expect(await studentCredits(page)).toBe(18)
})

test('aluna agenda um horário publicado sem aprovação e o saldo diminui uma vez', async ({
  page,
}) => {
  await login(page, users.student.email)
  await openAgendaOnBookingDay(page)

  await clickSlot(page, '10:00:00')
  await expect(page.getByRole('dialog')).toContainText('Criar nova aula')
  await page.getByRole('button', { name: 'Confirmar agendamento' }).click()

  await expect(page.getByRole('status')).toContainText('Aula agendada')
  await expect(
    page.locator('.fc-event').filter({ hasText: 'Paula Personal' }),
  ).toBeVisible()
  expect(await studentCredits(page)).toBe(17)
})

test('aluna cancela a aula e recupera o crédito uma única vez', async ({ page }) => {
  await login(page, users.student.email)
  await openAgendaOnBookingDay(page)

  await page.locator('.fc-event').filter({ hasText: 'Paula Personal' }).click()
  await page.getByRole('button', { name: 'Cancelar aula' }).click()
  await page.getByLabel(/Motivo/).fill('Compromisso de trabalho')
  await page.getByRole('button', { name: 'Confirmar cancelamento' }).click()

  await expect(page.getByRole('status')).toContainText('Aula cancelada')
  expect(await studentCredits(page)).toBe(18)
})

test('aluna remarca sem consumir crédito adicional', async ({ page }) => {
  await login(page, users.student.email)
  await openAgendaOnBookingDay(page)

  // O horário das 10:00 ainda exibe a aula cancelada; usa outro slot livre.
  await clickSlot(page, '12:00:00')
  await page.getByRole('button', { name: 'Confirmar agendamento' }).click()
  await expect(page.getByRole('status')).toContainText('Aula agendada')

  const scheduled = page.locator('.fc-event.dedic-calendar-event--scheduled')
  await scheduled.click()
  await page.getByRole('button', { name: 'Remarcar aula' }).click()
  await page.getByLabel('Nova data').fill(futureDate(bookingDay))
  await page.getByRole('button', { name: '13:00' }).click()
  await page.getByRole('button', { name: 'Confirmar remarcação' }).click()

  await expect(page.getByRole('status')).toContainText('Aula remarcada')
  await expect(scheduled).toContainText('13:00')
  expect(await studentCredits(page)).toBe(17)
})

test('personal registra um pagamento e a aluna vê a situação', async ({ page }) => {
  await login(page, users.trainer.email)
  await page.goto('/app/financeiro')
  await page.getByRole('button', { name: 'Registrar pagamento' }).click()
  await page.getByLabel('Pacote e aluno').selectOption({ label: 'Ana Aluna · 10 aulas' })
  await page.getByLabel('Valor (R$)').fill('500')
  await page.getByLabel('Vencimento').fill(futureDate(10))
  await page.getByLabel('Situação').selectOption('paid')
  await page.getByLabel('Data do pagamento').fill(futureDate(0))
  await page.getByRole('button', { name: 'Salvar pagamento' }).click()
  await expect(page.getByText('R$ 500,00').first()).toBeVisible()
  await logout(page)

  await login(page, users.student.email)
  await page.goto('/app/financeiro')
  await expect(page.getByText('R$ 500,00').first()).toBeVisible()
  await expect(page.getByText('Pago', { exact: true }).first()).toBeVisible()
})
