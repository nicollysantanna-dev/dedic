import { loginSchema, signUpSchema } from '@/features/auth/schemas'

describe('auth schemas', () => {
  it('valida um login bem formado', () => {
    expect(
      loginSchema.safeParse({ email: 'aluna@dedic.test', password: '12345678' }).success,
    ).toBe(true)
  })

  it('exige duração padrão para personal', () => {
    const result = signUpSchema.safeParse({
      email: 'personal@dedic.test',
      password: '12345678',
      fullName: 'Personal Teste',
      phone: '',
      role: 'trainer',
    })

    expect(result.success).toBe(false)
  })
})
