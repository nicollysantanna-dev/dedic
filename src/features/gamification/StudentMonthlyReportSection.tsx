import { useState } from 'react'

import { MonthlyReportView } from '@/features/gamification/MonthlyReportView'
import { useFirstCheckInDay, useMonthlyReport } from '@/features/gamification/queries'
import {
  currentReportMonth,
  formatMonthTitle,
  monthKey,
  monthsBetween,
  todayInSaoPaulo,
} from '@/features/gamification/report-month'

/**
 * Relatório mensal do aluno visto pelo personal. Só leitura: sem compartilhar,
 * e o banco só entrega enquanto o vínculo estiver ativo.
 */
export function StudentMonthlyReportSection({ studentId }: { studentId: string }) {
  const currentMonth = currentReportMonth()
  const [month, setMonth] = useState(currentMonth)
  const firstDay = useFirstCheckInDay(studentId)
  const report = useMonthlyReport(studentId, month)

  const firstMonth = firstDay.data ? monthKey(firstDay.data) : month
  const monthOptions = monthsBetween(
    firstMonth < month ? firstMonth : month,
    currentMonth,
  )

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-300">
        Mês
        <select
          className="field mt-1 w-full sm:w-64"
          onChange={(event) => setMonth(event.target.value)}
          value={month}
        >
          {monthOptions.map((option) => (
            <option key={option} value={option}>
              {formatMonthTitle(`${option}-01`)}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4">
        {report.isPending && (
          <p className="rounded-[1.5rem] bg-white/5 p-5 text-sm text-slate-300">
            Carregando relatório…
          </p>
        )}
        {report.isError && (
          <p className="rounded-[1.5rem] bg-white p-5 text-sm text-red-700" role="alert">
            Não foi possível carregar este mês.
          </p>
        )}
        {report.data && (
          <MonthlyReportView report={report.data} today={todayInSaoPaulo()} />
        )}
      </div>
    </div>
  )
}
