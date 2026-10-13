import { describe, expect, it } from 'vitest'

import { checkInBackgroundEvents } from '@/features/appointments/calendar-view'

describe('checkInBackgroundEvents', () => {
  it('cria um fundo de dia inteiro para cada dia com check-in', () => {
    expect(checkInBackgroundEvents(['2026-10-12', '2026-10-14'])).toEqual([
      {
        id: 'check-in-2026-10-12',
        start: '2026-10-12',
        allDay: true,
        display: 'background',
        classNames: ['dedic-calendar-check-in'],
      },
      {
        id: 'check-in-2026-10-14',
        start: '2026-10-14',
        allDay: true,
        display: 'background',
        classNames: ['dedic-calendar-check-in'],
      },
    ])
  })

  it('sem check-ins não gera eventos', () => {
    expect(checkInBackgroundEvents([])).toEqual([])
  })
})
