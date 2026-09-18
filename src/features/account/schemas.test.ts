import { describe, expect, it } from 'vitest'

import { profileSchema } from './schemas'

describe('profileSchema', () => {
  it('aceita aluna sem celular e sem duração', () => {
    expect(
      profileSchema.safeParse({ fullName: 'Ana Aluna', phone: '', role: 'student' })
        .success,
    ).toBe(true)
  })

  it('exige duração válida para o personal', () => {
    const result = profileSchema.safeParse({
      fullName: 'Paula Personal',
      phone: '(11) 98888-7777',
      role: 'trainer',
      defaultLessonDurationMinutes: 50,
    })
    expect(result.success).toBe(false)
  })

  it('recusa celular fora do formato brasileiro', () => {
    const result = profileSchema.safeParse({
      fullName: 'Ana Aluna',
      phone: '11 98888',
      role: 'student',
    })
    expect(result.success).toBe(false)
  })
})
