import { z } from 'zod'

export const paymentSchema = z
  .object({
    packageId: z.uuid('Selecione um pacote.'),
    amountReais: z.number().positive('Informe um valor maior que zero.'),
    dueOn: z.iso.date('Informe o vencimento.'),
    status: z.enum(['pending', 'paid', 'overdue', 'cancelled']),
    paidOn: z.string(),
  })
  .refine((value) => value.status !== 'paid' || Boolean(value.paidOn), {
    message: 'Informe a data do pagamento.',
    path: ['paidOn'],
  })

export type PaymentValues = z.infer<typeof paymentSchema>
