import { describe, expect, it } from 'vitest'

import { canMoveAppointment } from './appointment-drag'
import { isSelectionWithinAvailableSlots } from './available-slot-selection'
import { calendarViewLabels, getInitialCalendarView } from './calendar-view'

const baseAppointment = {
  id: 'appointment-1',
  starts_at: '2099-09-18T08:00:00-03:00',
  ends_at: '2099-09-18T09:00:00-03:00',
  status: 'scheduled' as const,
  profiles: { full_name: 'Ana' },
}

describe('canMoveAppointment', () => {
  it('permite arrastar uma aula agendada a partir do dia seguinte', () => {
    expect(
      canMoveAppointment(baseAppointment, new Date('2099-09-17T12:00:00-03:00')),
    ).toBe(true)
  })

  it('bloqueia a movimentação no próprio dia da aula', () => {
    expect(
      canMoveAppointment(baseAppointment, new Date('2099-09-18T06:00:00-03:00')),
    ).toBe(false)
  })

  it('bloqueia aulas concluídas', () => {
    expect(
      canMoveAppointment(
        { ...baseAppointment, status: 'completed' },
        new Date('2099-09-17T12:00:00-03:00'),
      ),
    ).toBe(false)
  })
})

describe('isSelectionWithinAvailableSlots', () => {
  const slots = [
    {
      slot_start: '2099-09-18T08:00:00-03:00',
      slot_end: '2099-09-18T09:00:00-03:00',
    },
  ]

  it('permite ao aluno selecionar um horário publicado', () => {
    expect(
      isSelectionWithinAvailableSlots(
        new Date('2099-09-18T08:00:00-03:00'),
        new Date('2099-09-18T09:00:00-03:00'),
        slots,
      ),
    ).toBe(true)
  })

  it('recusa horários fora da disponibilidade publicada', () => {
    expect(
      isSelectionWithinAvailableSlots(
        new Date('2099-09-18T09:00:00-03:00'),
        new Date('2099-09-18T10:00:00-03:00'),
        slots,
      ),
    ).toBe(false)
  })
})

describe('calendar views', () => {
  it('oferece visão de dia, três dias, semana e mês', () => {
    expect(Object.values(calendarViewLabels)).toEqual(['Dia', '3 dias', 'Semana', 'Mês'])
  })

  it('mantém dia no celular e semana no desktop como visões iniciais', () => {
    expect(getInitialCalendarView(true)).toBe('timeGridDay')
    expect(getInitialCalendarView(false)).toBe('timeGridWeek')
  })
})
