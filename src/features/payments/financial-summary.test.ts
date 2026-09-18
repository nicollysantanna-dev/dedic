import { describe, expect, it } from 'vitest'

import { buildFinancialSummary } from './financial-summary'

describe('buildFinancialSummary', () => {
  it('separa recebido, pendente e atrasado e agrupa receita paga por mês', () => {
    const summary = buildFinancialSummary(
      [
        payment('student-1', 40_000, 'paid', '2026-09-05', '2026-09-04'),
        payment('student-2', 30_000, 'pending', '2026-09-20'),
        payment('student-3', 25_000, 'overdue', '2026-08-10'),
        payment('student-4', 35_000, 'paid', '2026-08-05', '2026-08-05'),
      ],
      new Date(2026, 8, 16),
    )

    expect(summary).toMatchObject({
      receivedCents: 40_000,
      pendingCents: 30_000,
      overdueCents: 25_000,
      paidStudents: 2,
      totalStudents: 4,
    })
    expect(summary.monthlyRevenue.at(-1)).toMatchObject({
      key: '2026-09',
      amountCents: 40_000,
    })
  })
})

function payment(
  studentId: string,
  amountCents: number,
  status: 'pending' | 'paid' | 'overdue',
  dueOn: string,
  paidOn: string | null = null,
) {
  return {
    student_id: studentId,
    amount_cents: amountCents,
    status,
    due_on: dueOn,
    paid_on: paidOn,
  }
}
