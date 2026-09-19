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

test('personal edita a duração padrão e os horários publicados mudam', async ({
  page,
}) => {
  await login(page, users.trainer.email)
  await page.goto('/app/conta')
  await page.getByRole('button', { name: 'Editar perfil' }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar perfil' })
  await dialog.getByLabel('Nome completo').fill('Paula P. Silva')
  await dialog.getByLabel('Celular').fill('11988887777')
  await dialog.getByLabel(/Duração padrão da aula/).selectOption('30')
  await dialog.getByRole('button', { name: 'Salvar perfil' }).click()

  await expect(page.getByRole('status')).toContainText('Perfil atualizado.')
  await expect(page.getByRole('heading', { name: 'Paula P. Silva' })).toBeVisible()
  await expect(page.getByText('(11) 98888-7777')).toBeVisible()
  await expect(page.getByText('Aulas de 30 minutos')).toBeVisible()

  // Com 30 minutos, a remarcação passa a oferecer horários de meia em meia hora.
  await openAgendaOnBookingDay(page)
  const scheduled = page.locator('.fc-event.dedic-calendar-event--scheduled')
  await scheduled.click()
  await page.getByRole('button', { name: 'Remarcar aula' }).click()
  await page.getByLabel('Nova data').fill(futureDate(bookingDay + 1))
  await expect(page.getByRole('button', { name: '06:30' })).toBeVisible()
})

test('personal encerra o vínculo e a aluna deixa de ver a agenda', async ({ page }) => {
  await login(page, users.trainer.email)
  await page.goto('/app/alunos')
  await page.getByRole('link', { name: /Bruno Aluno/ }).click()
  await page.getByRole('button', { name: 'Encerrar vínculo' }).click()
  await page.getByRole('button', { name: 'Sim, encerrar' }).click()

  await expect(page).toHaveURL(/\/app\/alunos$/)
  await expect(page.getByRole('link', { name: /Bruno Aluno/ })).toHaveCount(0)
  await logout(page)

  await login(page, 'aluno@dedic.local')
  await expect(page.getByText('Aguardando vínculo com o personal.')).toBeVisible()
})

test('aluna navega pela própria sessão: créditos, extrato e personal', async ({
  page,
}) => {
  await login(page, users.student.email)

  await page.getByRole('link', { name: 'Créditos' }).first().click()
  await expect(page).toHaveURL(/\/app\/creditos$/)
  await expect(page.getByRole('heading', { name: 'Créditos' })).toBeVisible()
  await expect(page.getByText('Ativação do pacote').first()).toBeVisible()
  await expect(page.getByText('Consumo por aula').first()).toBeVisible()
  await expect(page.getByText('Devolução por cancelamento').first()).toBeVisible()

  await page.goto('/app')
  await page.getByRole('link', { name: 'Meu personal' }).click()
  await expect(page).toHaveURL(/\/app\/personal$/)
  await expect(page.getByRole('heading', { name: 'Paula P. Silva' })).toBeVisible()

  // A área de alunos é do personal: aluna é redirecionada.
  await page.goto('/app/alunos')
  await expect(page).toHaveURL(/\/app\/personal$/)
  await expect(page.getByRole('link', { name: 'Alunos' })).toHaveCount(0)
})

test('evolução: aluna registra peso e foto, personal define meta e a exclusão some para ambos', async ({
  page,
}) => {
  await login(page, users.student.email)
  await page.goto('/app/evolucao')

  // Dois registros de peso em datas diferentes para o gráfico aparecer.
  for (const [date, weight] of [
    [futureDate(-10), '70'],
    [futureDate(0), '68,5'],
  ] as const) {
    await page.getByRole('button', { name: 'Registrar' }).click()
    const dialog = page.getByRole('dialog', { name: 'Registrar peso e medidas' })
    await dialog.getByLabel('Data').fill(date)
    await dialog.getByLabel('Peso (kg)').fill(weight)
    await dialog.getByLabel('Cintura').fill('74')
    await dialog.getByRole('button', { name: 'Salvar registro' }).click()
    await expect(dialog).toBeHidden()
  }
  await expect(page.getByText(/68,5 kg em/)).toBeVisible()
  await expect(page.getByText('74 cm')).toBeVisible()
  await expect(page.locator('.recharts-line')).toBeVisible()

  // Envia uma foto: um recorte da própria tela serve como PNG válido.
  await page.getByTestId('photo-input').setInputFiles({
    name: 'frente.png',
    mimeType: 'image/png',
    buffer: await page.screenshot({ clip: { x: 0, y: 0, width: 60, height: 80 } }),
  })
  await expect(page.getByRole('img', { name: 'Frente' })).toBeVisible()
  await logout(page)

  // Personal vê tudo e define uma meta.
  await login(page, users.trainer.email)
  await page.goto('/app/alunos')
  await page.getByRole('link', { name: /Ana Aluna/ }).click()
  await expect(page.getByText(/68,5 kg em/)).toBeVisible()
  await expect(page.getByRole('img', { name: 'Frente' })).toBeVisible()
  await expect(page.getByLabel(/Excluir foto/)).toHaveCount(0)

  await page.getByRole('button', { name: 'Nova meta' }).click()
  const goalDialog = page.getByRole('dialog', { name: 'Nova meta' })
  await goalDialog.getByLabel('Valor-alvo').fill('64')
  await goalDialog.getByLabel('Data-alvo').fill(futureDate(60))
  await goalDialog.getByRole('button', { name: 'Salvar meta' }).click()
  await expect(page.getByText(/Peso: 68,5 → 64 kg/)).toBeVisible()
  await logout(page)

  // Aluna vê a meta e exclui a foto.
  await login(page, users.student.email)
  await page.goto('/app/evolucao')
  await expect(page.getByText(/Peso: 68,5 → 64 kg/)).toBeVisible()
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByLabel(/Excluir foto/).click()
  await expect(page.getByRole('img', { name: 'Frente' })).toHaveCount(0)
  await logout(page)

  await login(page, users.trainer.email)
  await page.goto('/app/alunos')
  await page.getByRole('link', { name: /Ana Aluna/ }).click()
  await expect(page.getByText('Nenhuma foto enviada ainda.')).toBeVisible()
})

test('dashboard do personal mostra alertas, próximas aulas e abre a aula pelo atalho', async ({
  page,
}) => {
  await login(page, users.trainer.email)

  // Garante uma aula futura da Ana criada pelo personal.
  await page.goto('/app/agenda?novo=1')
  const createDialog = page.getByRole('dialog')
  await createDialog.getByLabel('Aluno').selectOption({ label: 'Ana Aluna' })
  await createDialog
    .getByLabel('Data e horário')
    .fill(`${futureDate(bookingDay + 2)}T09:00`)
  await createDialog.getByRole('button', { name: 'Confirmar agendamento' }).click()
  await expect(page.getByRole('status')).toContainText('Aula agendada')

  await page.goto('/app')
  await expect(page.getByText('Alunos ativos').first()).toBeVisible()
  const upcoming = page.locator('section').filter({ hasText: 'Próximas aulas' })
  await expect(upcoming.getByRole('link', { name: /Ana Aluna/ }).first()).toBeVisible()

  // Atalho abre o painel da aula na agenda, mesmo fora do período visível.
  await upcoming
    .getByRole('link', { name: /Ana Aluna/ })
    .first()
    .click()
  await expect(page).toHaveURL(/\/app\/agenda/)
  await expect(page.getByRole('dialog')).toContainText('Ana Aluna')
  await expect(page.getByRole('button', { name: 'Cancelar aula' })).toBeVisible()

  // Lista de alunos: a aluna com meta vencida ou sem crédito aparece no filtro Atenção.
  await page.goto('/app/alunos')
  await page.getByRole('button', { name: 'Atenção' }).click()
  await expect(page.getByText('Nenhum aluno encontrado.')).toBeVisible()
})

test('aula avulsa aguarda pagamento, baixa ativa os créditos e a aluna é notificada', async ({
  page,
}) => {
  await login(page, users.trainer.email)
  await page.goto('/app/alunos')
  await page.getByRole('link', { name: /Ana Aluna/ }).click()
  const creditsBefore = Number(
    (
      await page
        .locator('div')
        .filter({ hasText: /^Créditos\d+$/ })
        .first()
        .locator('p')
        .nth(1)
        .innerText()
    ).trim(),
  )

  await page.getByRole('button', { name: 'Adicionar aulas' }).click()
  const dialog = page.getByRole('dialog', { name: 'Adicionar aulas' })
  await dialog.getByRole('button', { name: 'Aula avulsa' }).click()
  await dialog.getByLabel('Valor (R$)').fill('150')
  await dialog.getByLabel('Liberar créditos agora').uncheck()
  await dialog.getByRole('button', { name: 'Registrar aula avulsa' }).click()
  await expect(
    page.getByText(/Aula avulsa registrada.*aguardando pagamento/),
  ).toBeVisible()

  // Cobrança gerada automaticamente; ao pagar, o financeiro oferece ativar os créditos.
  await page.goto('/app/financeiro')
  const row = page.locator('article').filter({ hasText: 'avulsa' }).first()
  await expect(row).toContainText('R$ 150,00')
  await expect(row).toContainText('Pendente')
  await row.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Situação').selectOption('paid')
  await page.getByLabel('Data do pagamento').fill(futureDate(0))
  await page.getByRole('button', { name: 'Salvar pagamento' }).click()
  await row.getByRole('button', { name: 'Ativar créditos' }).click()
  await expect(row.getByRole('button', { name: 'Ativar créditos' })).toHaveCount(0)

  await page.goto(`/app/alunos`)
  await page.getByRole('link', { name: /Ana Aluna/ }).click()
  await expect(
    page
      .locator('div')
      .filter({ hasText: new RegExp(`^Créditos${creditsBefore + 1}$`) })
      .first(),
  ).toBeVisible()
  await logout(page)

  // Aluna recebe notificações de cobrança, pagamento e créditos.
  await login(page, users.student.email)
  await page
    .getByRole('link', { name: /Notificações/ })
    .first()
    .click()
  await expect(page).toHaveURL(/\/app\/notificacoes$/)
  await expect(page.getByText(/Cobrança de R\$\s?150,00/).first()).toBeVisible()
  await expect(
    page.getByText(/Pagamento de R\$\s?150,00 confirmado/).first(),
  ).toBeVisible()
  await expect(page.getByText('1 crédito adicionado').first()).toBeVisible()
  await page.getByRole('button', { name: 'Marcar todas como lidas' }).click()
  await expect(page.getByRole('button', { name: 'Marcar todas como lidas' })).toHaveCount(
    0,
  )
})
