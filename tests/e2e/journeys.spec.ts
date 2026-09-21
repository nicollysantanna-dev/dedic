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
  // Espera o calendário montar antes de trocar a visão (o clique antes disso é ignorado).
  await expect(page.locator('.fc-timegrid-slot-lane').first()).toBeVisible()
  const dayButton = page.getByRole('button', { name: 'Dia', exact: true })
  await expect(async () => {
    await dayButton.click()
    await expect(dayButton).toHaveAttribute('aria-pressed', 'true', { timeout: 1500 })
  }).toPass()
  // Avança um dia por vez, esperando a coluna do dia-alvo aparecer.
  const target = futureDate(bookingDay)
  for (let index = 0; index < bookingDay; index += 1) {
    await page.getByRole('button', { name: 'Próximo período' }).click()
    await page.waitForTimeout(150)
  }
  await expect(page.locator(`.fc-timegrid-col[data-date="${target}"]`)).toBeVisible()
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

test('biblioteca de exercícios: busca em português, apelido e exercício próprio', async ({
  page,
}) => {
  await login(page, users.trainer.email)
  await page.goto('/app/exercicios')
  await page.getByLabel('Buscar exercício').fill('supino reto')
  const card = page
    .locator('article')
    .filter({ hasText: 'Supino reto com barra' })
    .first()
  await expect(card).toBeVisible()
  await expect(card).toContainText('Barbell Bench Press - Medium Grip')

  // Demonstração vem do nosso bucket (imagens do free-exercise-db).
  await card.getByRole('button', { name: 'Ver demonstração' }).click()
  await expect(
    card.getByRole('img', { name: 'Demonstração de Supino reto com barra' }),
  ).toBeVisible()

  await card.getByRole('button', { name: /Apelidar/ }).click()
  await page.getByLabel('Apelido').fill('Supino reto (Paula)')
  await page.getByRole('button', { name: 'Salvar apelido' }).click()
  await expect(
    page.locator('article').filter({ hasText: 'Supino reto (Paula)' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Criar exercício' }).click()
  const createDialog = page.getByRole('dialog', { name: 'Criar exercício' })
  await createDialog.getByLabel('Nome').fill('Agachamento no caixote (Paula)')
  await createDialog.getByRole('button', { name: 'Criar exercício' }).click()
  await expect(createDialog).toBeHidden()
  await page.getByLabel('Buscar exercício').fill('caixote')
  await expect(
    page.locator('article').filter({ hasText: 'Exercício próprio' }),
  ).toBeVisible()
})

test('personal monta uma ficha estilo Hevy e a aluna a vê em Treinos', async ({
  page,
}) => {
  await login(page, users.trainer.email)
  await page.goto('/app/alunos')
  await page.getByRole('link', { name: /Ana Aluna/ }).click()
  await page.getByRole('link', { name: 'Nova ficha' }).click()
  await expect(page).toHaveURL(/\/app\/fichas\/nova/)

  await page.getByPlaceholder('Nome da ficha').fill('Treino A')
  await page.getByRole('button', { name: 'Adicionar exercício' }).click()
  await page.getByPlaceholder('Buscar exercício').fill('supino inclinado com barra')
  await page
    .getByRole('button', { name: /Supino inclinado com barra/ })
    .first()
    .click()
  await page.getByLabel('Carga da série 1 de Supino inclinado com barra').fill('40')
  await page.getByLabel('Repetições da série 1 de Supino inclinado com barra').fill('12')
  await page.getByLabel('Descanso de Supino inclinado com barra').selectOption('120')
  await page.getByRole('button', { name: 'Adicionar exercício' }).click()
  await page.getByPlaceholder('Buscar exercício').fill('agachamento livre')
  await page
    .getByRole('button', { name: /Agachamento livre/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page).toHaveURL(/\/app\/alunos\//)
  const card = page.locator('article').filter({ hasText: 'Treino A' }).first()
  await expect(card).toContainText('Supino inclinado com barra')
  await card.getByRole('button', { name: 'Ver exercícios' }).click()
  await expect(card).toContainText('40 kg × 12')
  await expect(card).toContainText('2 min')
  await logout(page)

  await login(page, users.student.email)
  await page.getByRole('link', { name: 'Treinos' }).first().click()
  await expect(page).toHaveURL(/\/app\/treinos$/)
  const studentCard = page.locator('article').filter({ hasText: 'Treino A' }).first()
  await expect(studentCard).toContainText('Supino inclinado com barra')
  await page.goto('/app/notificacoes')
  await expect(page.getByText('Nova ficha: Treino A').first()).toBeVisible()
})

test('aluna registra uma sessão pela ficha e a próxima sessão traz a carga anterior', async ({
  page,
}) => {
  await login(page, users.student.email)
  await page.goto('/app/treinos')
  const card = page.locator('article').filter({ hasText: 'Treino A' }).first()
  await card.getByRole('button', { name: 'Iniciar ficha' }).click()
  await expect(page).toHaveURL(/\/app\/treinos\/sessao\//)
  await expect(page.getByRole('heading', { name: 'Treino A' })).toBeVisible()

  // Série 1 do supino veio da ficha (40 × 12); ajusta a carga e conclui.
  const weight = page.getByLabel('Carga da série 1 de Supino inclinado com barra')
  await expect(weight).toHaveValue('40')
  await weight.fill('42,5')
  await page.getByLabel('Concluir série 1 de Supino inclinado com barra').click()
  await expect(page.getByRole('timer')).toContainText('Descanso')
  await page.getByRole('button', { name: 'Pular descanso' }).click()

  // Série extra e finalização com resumo.
  await page.getByRole('button', { name: '+ Adicionar série' }).first().click()
  await page.getByLabel('Concluir série 4 de Supino inclinado com barra').click()
  // Primeira carga registrada no exercício: troféu ao vivo na série 1.
  await expect(
    page.getByRole('img', { name: /Recorde na série 1 de Supino inclinado/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Finalizar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Finalizar treino' })
  await expect(dialog).toContainText('2')
  await dialog.getByRole('button', { name: 'Finalizar treino' }).click()
  await expect(page.getByRole('heading', { name: 'Treino finalizado!' })).toBeVisible()
  await expect(page.getByText('1 recorde pessoal batido!')).toBeVisible()
  await page.getByRole('link', { name: 'Concluir' }).click()
  await expect(page).toHaveURL(/\/app\/treinos$/)

  // Histórico e recordes.
  await page.getByRole('button', { name: 'Histórico' }).click()
  const historyCard = page.getByRole('link', { name: /Treino A/ }).first()
  await expect(historyCard).toContainText('1 recorde')
  await expect(historyCard).toContainText('Supino inclinado com barra')
  await page.getByRole('button', { name: 'Recordes' }).click()
  const recordCard = page
    .locator('article')
    .filter({ hasText: 'Supino inclinado com barra' })
    .first()
  await expect(recordCard).toContainText('42,5 kg')
  await recordCard.getByRole('button', { name: /Ver evolução/ }).click()
  await expect(recordCard).toContainText('a partir do segundo treino')
  await page.getByRole('button', { name: 'Fichas' }).click()

  // Nova sessão: coluna "anterior" traz 42,5 × 12 da sessão passada.
  await card.getByRole('button', { name: 'Iniciar ficha' }).click()
  await expect(page).toHaveURL(/\/app\/treinos\/sessao\//)
  await expect(
    page.getByLabel('Carga da série 1 de Supino inclinado com barra'),
  ).toHaveValue('42.5')
  await expect(page.getByText('42.5 × 12').first()).toBeVisible()
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Descartar treino' }).click()
  await expect(page).toHaveURL(/\/app\/treinos$/)
  await logout(page)

  // Personal recebe a notificação e vê treinos e recordes no perfil da aluna.
  await login(page, users.trainer.email)
  await page.goto('/app/notificacoes')
  await expect(page.getByText('Ana finalizou um treino').first()).toBeVisible()
  await page.goto('/app/alunos')
  await page.getByRole('link', { name: /Ana Aluna/ }).click()
  const workoutsSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Treinos registrados' }) })
  await expect(workoutsSection).toContainText('1 treino')
  await expect(workoutsSection).toContainText('Supino inclinado com barra')
  await expect(workoutsSection).toContainText('42,5 kg')

  // Meta de carga no supino, partindo do melhor registro.
  await page.getByRole('button', { name: 'Nova meta' }).click()
  const goalDialog = page.getByRole('dialog', { name: 'Nova meta' })
  await goalDialog.getByLabel('Tipo').selectOption('exercise_load')
  await goalDialog.getByRole('button', { name: 'Escolher exercício' }).click()
  const goalPicker = page.getByRole('dialog', { name: 'Exercício da meta' })
  await goalPicker.getByPlaceholder('Buscar exercício').fill('supino inclinado com barra')
  await goalPicker
    .getByRole('button', { name: /Supino inclinado com barra/ })
    .first()
    .click()
  await expect(goalDialog.getByLabel('Valor inicial')).toHaveValue('42.5')
  await goalDialog.getByLabel('Valor-alvo').fill('60')
  await goalDialog.getByLabel('Data-alvo').fill(futureDate(90))
  await goalDialog.getByRole('button', { name: 'Salvar meta' }).click()
  await expect(
    page.getByText(/Carga · Supino inclinado com barra: 42,5 → 60 kg/),
  ).toBeVisible()
  await expect(page.getByText(/melhor carga registrada: 42,5 kg/)).toBeVisible()
})

test('aluna monta a própria ficha e amplia a demonstração do exercício', async ({
  page,
}) => {
  await login(page, users.student.email)
  await page.goto('/app/treinos')

  // A ficha do personal também é editável pela aluna (fichas são compartilhadas).
  const trainerCard = page.locator('article').filter({ hasText: 'Treino A' }).first()
  await expect(trainerCard).toContainText('Do personal')
  await trainerCard.getByRole('link', { name: 'Editar' }).click()
  await expect(page).toHaveURL(/\/app\/fichas\//)
  await page.getByPlaceholder('Nome da ficha').fill('Treino A (ajustado)')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page).toHaveURL(/\/app\/treinos$/)
  await expect(
    page.locator('article').filter({ hasText: 'Treino A (ajustado)' }).first(),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Nova ficha' }).click()
  await expect(page).toHaveURL(/\/app\/fichas\/nova/)
  await expect(page.getByLabel('Aluno')).toHaveCount(0)
  await page.getByPlaceholder('Nome da ficha').fill('Meu treino de braço')
  await page.getByRole('button', { name: 'Adicionar exercício' }).click()
  await page.getByPlaceholder('Buscar exercício').fill('rosca martelo')
  await page
    .getByRole('button', { name: /Rosca martelo/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page).toHaveURL(/\/app\/treinos$/)

  const ownCard = page
    .locator('article')
    .filter({ hasText: 'Meu treino de braço' })
    .first()
  await expect(ownCard).toContainText('Sua ficha')
  await expect(ownCard.getByRole('link', { name: 'Editar' })).toBeVisible()

  // Tocar na miniatura abre a execução em tela cheia.
  await ownCard.getByRole('button', { name: 'Ver exercícios' }).click()
  const thumb = ownCard.getByRole('button', { name: /Ver execução de Rosca martelo/ })
  await thumb.click()
  const lightbox = page.getByRole('dialog', { name: /Execução de Rosca martelo/ })
  await expect(lightbox).toBeVisible()
  await expect(lightbox.getByRole('img', { name: /Demonstração de/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(lightbox).toHaveCount(0)
})

test('personal cadastra a foto do aparelho e a aluna a vê nas listas e na sessão', async ({
  page,
}) => {
  await login(page, users.trainer.email)
  await page.goto('/app/exercicios')
  await page.getByLabel('Buscar exercício').fill('supino inclinado com barra')
  const card = page
    .locator('article')
    .filter({ hasText: 'Supino inclinado com barra' })
    .first()
  await card.getByRole('button', { name: 'Ver demonstração' }).click()
  await page.getByTestId('equipment-photo-input').setInputFiles({
    name: 'aparelho.png',
    mimeType: 'image/png',
    buffer: await page.screenshot({ clip: { x: 0, y: 0, width: 80, height: 60 } }),
  })
  await expect(
    card.getByRole('img', { name: /Aparelho: Supino inclinado/ }),
  ).toBeVisible()
  await expect(card.getByRole('button', { name: 'Trocar foto' })).toBeVisible()
  await logout(page)

  // Aluna: a foto aparece no seletor de exercícios e na ficha.
  await login(page, users.student.email)
  await page.goto('/app/treinos')
  const routineCard = page.locator('article').filter({ hasText: 'Treino A' }).first()
  await routineCard.getByRole('button', { name: 'Ver exercícios' }).click()
  const thumb = routineCard.getByRole('button', {
    name: 'Ver execução de Supino inclinado com barra',
  })
  await expect(thumb).toBeVisible()
  await thumb.click()
  const lightbox = page.getByRole('dialog', { name: /Execução de Supino inclinado/ })
  await expect(
    lightbox.getByRole('img', { name: /Aparelho: Supino inclinado/ }),
  ).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: 'Nova ficha' }).click()
  await page.getByRole('button', { name: 'Adicionar exercício' }).click()
  await page.getByPlaceholder('Buscar exercício').fill('supino inclinado com barra')
  const row = page.getByRole('button', { name: /Supino inclinado com barra/ }).first()
  await expect(row.getByRole('button', { name: /Ver execução/ })).toBeVisible()
})

test('aluna cria um exercício próprio com foto pelo seletor e substitui exercícios na ficha e na sessão', async ({
  page,
}) => {
  await login(page, users.student.email)
  await page.goto('/app/fichas/nova')
  await page.getByPlaceholder('Nome da ficha').fill('Treino da academia')

  // O seletor mostra miniaturas do catálogo em toda linha.
  await page.getByRole('button', { name: 'Adicionar exercício' }).click()
  await page.getByPlaceholder('Buscar exercício').fill('supino declinado com barra')
  const row = page.getByRole('button', { name: /Supino declinado com barra/ }).first()
  await expect(row.getByRole('button', { name: /Ver execução/ })).toBeVisible()
  await row.click()

  // Aparelho que não está no catálogo: nome + foto, já entra na ficha.
  await page.getByRole('button', { name: 'Adicionar exercício' }).click()
  await page.getByRole('button', { name: 'Criar exercício' }).click()
  const createDialog = page.getByRole('dialog', { name: 'Criar exercício' })
  await createDialog.getByLabel('Nome').fill('Leg press da academia')
  await createDialog.getByLabel('Parte do corpo').selectOption('upper legs')
  await page.getByTestId('custom-exercise-photo-input').setInputFiles({
    name: 'leg-press.png',
    mimeType: 'image/png',
    buffer: await page.screenshot({ clip: { x: 0, y: 0, width: 80, height: 60 } }),
  })
  await expect(createDialog.getByRole('img', { name: 'Foto do aparelho' })).toBeVisible()
  await createDialog.getByRole('button', { name: 'Criar e adicionar' }).click()
  await expect(createDialog).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Ver execução de Leg press da academia' }),
  ).toBeVisible()

  // Substituir mantém o bloco (séries) e troca só o exercício.
  await page.getByLabel('Carga da série 1 de Supino declinado com barra').fill('30')
  await page.getByRole('button', { name: 'Opções de Supino declinado com barra' }).click()
  await page.getByRole('button', { name: 'Substituir exercício' }).click()
  const replaceSheet = page.getByRole('dialog', { name: 'Substituir exercício' })
  await replaceSheet
    .getByPlaceholder('Buscar exercício')
    .fill('supino inclinado com barra')
  await replaceSheet
    .getByRole('button', { name: /Supino inclinado com barra/ })
    .first()
    .click()
  await expect(
    page.getByLabel('Carga da série 1 de Supino inclinado com barra'),
  ).toHaveValue('30')
  await expect(page.getByLabel(/Carga da série 1 de Supino declinado/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page).toHaveURL(/\/app\/treinos$/)

  const card = page.locator('article').filter({ hasText: 'Treino da academia' }).first()
  await expect(card).toContainText('Leg press da academia')

  // Na sessão, o mesmo menu substitui o exercício em andamento.
  await card.getByRole('button', { name: 'Iniciar ficha' }).click()
  await expect(page).toHaveURL(/\/app\/treinos\/sessao\//)
  await page.getByRole('button', { name: 'Opções de Leg press da academia' }).click()
  await page.getByRole('button', { name: 'Substituir exercício' }).click()
  await page
    .getByRole('dialog', { name: 'Substituir exercício' })
    .getByPlaceholder('Buscar exercício')
    .fill('leg press')
  await page
    .getByRole('button', { name: /Leg press Quadríceps/ })
    .first()
    .click()
  await expect(
    page.getByRole('heading', { name: 'Leg press', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Leg press da academia' })).toHaveCount(
    0,
  )
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Descartar treino' }).click()
  await logout(page)

  // O personal vinculado vê o exercício da aluna, com a foto, na biblioteca.
  await login(page, users.trainer.email)
  await page.goto('/app/exercicios')
  await page.getByLabel('Buscar exercício').fill('leg press da academia')
  const trainerCard = page
    .locator('article')
    .filter({ hasText: 'Leg press da academia' })
    .first()
  await expect(trainerCard).toContainText('Exercício próprio')
  await expect(
    trainerCard.getByRole('img', { name: 'Aparelho: Leg press da academia' }),
  ).toBeVisible()
})
