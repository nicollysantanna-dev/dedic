import { z } from 'zod'

const phonePattern = /^\(\d{2}\) \d{4,5}-\d{4}$/

export const profileSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Informe seu nome completo.').max(100),
    phone: z
      .string()
      .trim()
      .refine((value) => value === '' || phonePattern.test(value), {
        message: 'Informe um celular no formato (11) 99999-9999.',
      }),
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

export type ProfileValues = z.infer<typeof profileSchema>
