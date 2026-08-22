import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppointmentCalendar } from './AppointmentCalendar'
import type { Tables } from '@/lib/supabase/database.types'

describe('AppointmentCalendar', () => {
  it('marca visualmente um dia com aula agendada', () => {
    const appointment = {
      id: 'appointment-1',
      status: 'scheduled',
      starts_at: '2026-08-24T11:00:00Z',
    } as Tables<'appointments'>

    const { container } = render(
      <AppointmentCalendar appointments={[appointment]} onSelect={vi.fn()} />,
    )

    expect(screen.getByText('Visão mensal')).toBeInTheDocument()
    expect(container.querySelector('.dedic-day-scheduled')).toBeInTheDocument()
  })

  it('diferencia dias disponíveis e bloqueados', () => {
    const { container } = render(
      <AppointmentCalendar
        appointments={[]}
        availableSlots={[{ slot_start: '2026-08-25T11:00:00Z' }]}
        blockedPeriods={[{ starts_at: '2026-08-26T11:00:00Z' }]}
        onSelect={vi.fn()}
      />,
    )

    expect(container.querySelector('.dedic-day-available')).toBeInTheDocument()
    expect(container.querySelector('.dedic-day-blocked')).toBeInTheDocument()
    expect(screen.getByText('Disponível')).toBeInTheDocument()
    expect(screen.getByText('Bloqueio')).toBeInTheDocument()
  })
})
