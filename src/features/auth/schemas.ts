import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.'),
})

export const signUpSchema = loginSchema
  .extend({
    fullName: z.string().trim().min(2, 'Informe seu nome completo.'),
    phone: z.string().trim().optional(),
    role: z.enum(['student', 'trainer']),
    defaultLessonDurationMinutes: z.number().optional(),
  })
  .superRefine((data, context) => {
    if (
      data.role === 'trainer' &&
      ![30, 45, 60, 75, 90].includes(data.defaultLessonDurationMinutes ?? 0)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['defaultLessonDurationMinutes'],
        message: 'Escolha a duração padrão das aulas.',
      })
    }
  })

export type LoginValues = z.infer<typeof loginSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
