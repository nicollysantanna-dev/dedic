import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AgendaTimeline } from './AgendaTimeline'
import { getAgendaDays } from './agenda-view'

describe('AgendaTimeline', () => {
  const anchor = new Date(2026, 8, 16, 12)

  it('alterna a visualização e permite voltar para hoje', () => {
    const onViewChange = vi.fn()
    const onAnchorDateChange = vi.fn()

    render(
      <AgendaTimeline
        anchorDate={anchor}
        appointments={[]}
        onAnchorDateChange={onAnchorDateChange}
        onSelectDay={vi.fn()}
        onViewChange={onViewChange}
        view="day"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '3 dias' }))
    expect(onViewChange).toHaveBeenCalledWith('threeDays')

    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }))
    expect(onAnchorDateChange).toHaveBeenCalledOnce()
  })

  it('mostra aluno, horário e estado no evento', () => {
    render(
      <AgendaTimeline
        anchorDate={anchor}
        appointments={[
          {
            id: 'lesson-1',
            starts_at: '2026-09-16T08:00:00-03:00',
            ends_at: '2026-09-16T09:00:00-03:00',
            status: 'scheduled',
            profiles: { full_name: 'Ana Clara' },
          },
        ]}
        onAnchorDateChange={vi.fn()}
        onSelectDay={vi.fn()}
        onViewChange={vi.fn()}
        view="day"
      />,
    )

    expect(
      screen.getByRole('button', { name: /Ana Clara, Agendada, 08:00/ }),
    ).toBeInTheDocument()
  })

  it('permite selecionar um horário diretamente na grade', () => {
    const onSelectSlot = vi.fn()
    const futureAnchor = new Date(2099, 8, 16, 12)
    render(
      <AgendaTimeline
        anchorDate={futureAnchor}
        appointments={[]}
        availableSlots={[
          {
            slot_start: '2099-09-16T08:00:00-03:00',
            slot_end: '2099-09-16T09:00:00-03:00',
          },
        ]}
        onAnchorDateChange={vi.fn()}
        onSelectDay={vi.fn()}
        onSelectSlot={onSelectSlot}
        onViewChange={vi.fn()}
        view="day"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Horário publicado, 08:00' }))
    expect(onSelectSlot).toHaveBeenCalledWith('2099-09-16T11:00:00.000Z')
  })
})

describe('getAgendaDays', () => {
  it('inicia a visão semanal na segunda-feira', () => {
    const days = getAgendaDays(new Date(2026, 8, 16, 12), 'week')
    expect(days).toHaveLength(7)
    expect(days[0].getDay()).toBe(1)
    expect(days[6].getDay()).toBe(0)
  })
})
