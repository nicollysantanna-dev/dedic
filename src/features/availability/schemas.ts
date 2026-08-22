import { z } from 'zod'

export const availabilityRuleSchema = z
  .object({
    isoWeekday: z.number().int().min(1).max(7),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Informe o horário inicial.'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Informe o horário final.'),
  })
  .refine((value) => value.startTime < value.endTime, {
    path: ['endTime'],
    message: 'O horário final deve ser posterior ao inicial.',
  })

export const availabilityExceptionSchema = z
  .object({
    startsAt: z.string().min(1, 'Informe o início do bloqueio.'),
    endsAt: z.string().min(1, 'Informe o fim do bloqueio.'),
    reason: z.string().trim().max(160).optional(),
  })
  .refine((value) => new Date(value.startsAt) < new Date(value.endsAt), {
    path: ['endsAt'],
    message: 'O fim deve ser posterior ao início.',
  })

export type AvailabilityRuleValues = z.infer<typeof availabilityRuleSchema>
export type AvailabilityExceptionValues = z.infer<typeof availabilityExceptionSchema>
