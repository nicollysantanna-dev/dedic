import { describe, expect, it } from 'vitest'

import {
  addDays,
  calendarWeekStarts,
  checkInsRemaining,
  currentReportMonth,
  formatMonthTitle,
  monthKey,
  monthsBetween,
  parseReportMonth,
  progressPercent,
  todayInSaoPaulo,
  weekStartOf,
} from '@/features/gamification/report-month'

describe('addDays', () => {
  it('soma dias atravessando o fim do mês', () => {
    expect(addDays('2026-09-28', 5)).toBe('2026-10-03')
  })
})

describe('weekStartOf', () => {
  it('devolve a segunda-feira da semana do dia', () => {
    expect(weekStartOf('2026-10-07')).toBe('2026-10-05')
    expect(weekStartOf('2026-10-05')).toBe('2026-10-05')
    expect(weekStartOf('2026-10-11')).toBe('2026-10-05')
  })
})

describe('todayInSaoPaulo', () => {
  it('usa o dia de São Paulo, não o de UTC', () => {
    expect(todayInSaoPaulo(new Date('2026-10-01T02:00:00Z'))).toBe('2026-09-30')
  })
})

describe('currentReportMonth', () => {
  it('usa o mês de São Paulo, mesmo quando já virou o dia em UTC', () => {
    // 2026-10-01 02:00 UTC é 30/09 23:00 em São Paulo.
    expect(currentReportMonth(new Date('2026-10-01T02:00:00Z'))).toBe('2026-09')
  })
})

describe('parseReportMonth', () => {
  it('converte AAAA-MM para o primeiro dia do mês', () => {
    expect(parseReportMonth('2026-09')).toBe('2026-09-01')
  })

  it('recusa valores fora do formato ou meses inexistentes', () => {
    expect(parseReportMonth('2026-13')).toBeNull()
    expect(parseReportMonth('2026-9')).toBeNull()
    expect(parseReportMonth('setembro')).toBeNull()
    expect(parseReportMonth(undefined)).toBeNull()
  })
})

describe('monthKey', () => {
  it('reduz uma data ao mês AAAA-MM', () => {
    expect(monthKey('2026-09-01')).toBe('2026-09')
    expect(monthKey('2026-09-30')).toBe('2026-09')
  })
})

describe('monthsBetween', () => {
  it('lista os meses do mais recente para o mais antigo', () => {
    expect(monthsBetween('2026-07', '2026-09')).toEqual(['2026-09', '2026-08', '2026-07'])
  })

  it('volta vazio quando o primeiro mês é depois do último', () => {
    expect(monthsBetween('2026-10', '2026-09')).toEqual([])
  })
})

describe('formatMonthTitle', () => {
  it('escreve o mês por extenso em português', () => {
    expect(formatMonthTitle('2026-09-01')).toBe('setembro de 2026')
  })
})

describe('checkInsRemaining', () => {
  it('conta quantos check-ins faltam para bater a meta da semana', () => {
    expect(checkInsRemaining({ check_ins: 1, target: 3 })).toBe(2)
  })

  it('não fica negativo quando a meta já foi batida', () => {
    expect(checkInsRemaining({ check_ins: 5, target: 3 })).toBe(0)
  })
})

describe('progressPercent', () => {
  it('calcula o progresso até a medalha, limitado a 100%', () => {
    expect(progressPercent(1, 4)).toBe(25)
    expect(progressPercent(9, 4)).toBe(100)
  })

  it('evita divisão por zero', () => {
    expect(progressPercent(3, 0)).toBe(0)
  })
})

describe('calendarWeekStarts', () => {
  it('cobre todos os dias do mês, incluindo a semana que atravessa a virada', () => {
    // Setembro/2026 começa numa terça (semana de 31/08) e termina numa quarta (semana de 28/09).
    expect(calendarWeekStarts('2026-09')).toEqual([
      '2026-08-31',
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
    ])
  })

  it('não cria semana extra quando o mês começa numa segunda', () => {
    expect(calendarWeekStarts('2026-06')).toEqual([
      '2026-06-01',
      '2026-06-08',
      '2026-06-15',
      '2026-06-22',
      '2026-06-29',
    ])
  })
})
