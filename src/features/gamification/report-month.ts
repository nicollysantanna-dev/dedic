const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/

/** Converte "AAAA-MM" (parâmetro da rota) para o primeiro dia do mês, ou null se inválido. */
export function parseReportMonth(value: string | undefined): string | null {
  const match = value ? monthPattern.exec(value) : null
  return match ? `${match[1]}-${match[2]}-01` : null
}

/** Reduz uma data "AAAA-MM-DD" ao mês "AAAA-MM". */
export function monthKey(day: string): string {
  return day.slice(0, 7)
}

/** Meses entre dois "AAAA-MM", do mais recente para o mais antigo. */
export function monthsBetween(first: string, last: string): string[] {
  const months: string[] = []
  let cursor = last
  while (cursor >= first) {
    months.push(cursor)
    cursor = previousMonth(cursor)
  }
  return months
}

function previousMonth(month: string): string {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, number - 2, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Soma dias a uma data "AAAA-MM-DD" sem depender do fuso do navegador. */
export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

/** Segunda-feira da semana (ISO) que contém o dia "AAAA-MM-DD". */
export function weekStartOf(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay() // 0 = domingo
  return addDays(day, -((weekday + 6) % 7))
}

/** Dia atual "AAAA-MM-DD" no fuso de São Paulo. */
export function todayInSaoPaulo(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: string) => parts.find((part) => part.type === type)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}

/** Mês atual "AAAA-MM" no fuso de São Paulo, usado pela home e pelo relatório. */
export function currentReportMonth(now: Date = new Date()): string {
  return monthKey(todayInSaoPaulo(now))
}

/** Título do mês por extenso, em português (ex.: "setembro de 2026"). */
export function formatMonthTitle(day: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`))
}

/** Quantos check-ins faltam para a semana bater a meta. */
export function checkInsRemaining(week: { check_ins: number; target: number }): number {
  return Math.max(0, week.target - week.check_ins)
}

/** Progresso até a próxima medalha, de 0 a 100. */
export function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

/**
 * Segundas-feiras das semanas que tocam o mês, do primeiro ao último dia. Diferente da
 * regra de pontuação (semana pela quinta), o calendário mostra todos os dias do mês.
 */
export function calendarWeekStarts(month: string): string[] {
  const [year, number] = month.split('-').map(Number)
  const firstDay = `${month}-01`
  const nextMonthFirst = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10)
  const lastDay = addDays(nextMonthFirst, -1)
  const weeks: string[] = []
  for (let week = weekStartOf(firstDay); week <= lastDay; week = addDays(week, 7)) {
    weeks.push(week)
  }
  return weeks
}

/** Linhas do calendário: uma por semana que toca o mês. Só a semana do mês tem META. */
export function calendarRows(report: {
  month: string
  weeks: { week_start: string; met: boolean }[]
}) {
  return calendarWeekStarts(report.month).map((weekStart) => {
    const week = report.weeks.find((item) => item.week_start === weekStart)
    return { week_start: weekStart, met: week?.met ?? false }
  })
}
