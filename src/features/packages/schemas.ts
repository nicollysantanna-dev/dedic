import { z } from 'zod'

export const packageSchema = z
  .object({
    relationshipId: z.uuid('Selecione um aluno.'),
    lessonCount: z.number().int().min(1).max(100),
    priceReais: z.number().min(0).max(100000),
    startsOn: z.iso.date('Informe a data inicial.'),
    expiresOn: z.iso.date('Informe a renovação prevista.'),
  })
  .refine((value) => value.expiresOn >= value.startsOn, {
    path: ['expiresOn'],
    message: 'A renovação deve ser posterior ao início.',
  })

export const creditAdjustmentSchema = z.object({
  amount: z
    .number()
    .int()
    .min(-100)
    .max(100)
    .refine((value) => value !== 0, {
      message: 'O ajuste não pode ser zero.',
    }),
  reason: z.string().trim().min(4, 'Explique o motivo do ajuste.').max(240),
})

export type PackageValues = z.infer<typeof packageSchema>
export type CreditAdjustmentValues = z.infer<typeof creditAdjustmentSchema>
