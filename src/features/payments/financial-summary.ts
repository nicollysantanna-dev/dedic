import type { Tables } from '@/lib/supabase/database.types'

type Payment = Pick<
  Tables<'payments'>,
  'student_id' | 'amount_cents' | 'status' | 'due_on' | 'paid_on'
>

export type MonthlyRevenue = {
  key: string
  label: string
  amountCents: number
}

export function buildFinancialSummary(
  payments: readonly Payment[],
  referenceDate = new Date(),
) {
  const paid = payments.filter((payment) => payment.status === 'paid')
  const pending = payments.filter((payment) => payment.status === 'pending')
  const overdue = payments.filter((payment) => payment.status === 'overdue')
  const studentIds = new Set(payments.map((payment) => payment.student_id))
  const studentsWithDebt = new Set(
    [...pending, ...overdue].map((payment) => payment.student_id),
  )

  const referenceKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`
  const receivedThisMonth = paid.filter(
    (payment) => (payment.paid_on ?? payment.due_on).slice(0, 7) === referenceKey,
  )

  return {
    receivedCents: sum(receivedThisMonth),
    pendingCents: sum(pending),
    overdueCents: sum(overdue),
    paidStudents: Math.max(0, studentIds.size - studentsWithDebt.size),
    totalStudents: studentIds.size,
    monthlyRevenue: buildMonthlyRevenue(paid, referenceDate),
  }
}

export function buildMonthlyRevenue(
  payments: readonly Payment[],
  referenceDate = new Date(),
): MonthlyRevenue[] {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - 5 + index,
    )
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const amountCents = payments
      .filter(
        (payment) =>
          payment.status === 'paid' &&
          (payment.paid_on ?? payment.due_on).slice(0, 7) === key,
      )
      .reduce((total, payment) => total + payment.amount_cents, 0)

    return {
      key,
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(date)
        .replace('.', ''),
      amountCents,
    }
  })
}

function sum(payments: readonly Payment[]) {
  return payments.reduce((total, payment) => total + payment.amount_cents, 0)
}
