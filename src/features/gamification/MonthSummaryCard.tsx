import { ArrowRight, Flame } from 'lucide-react'
import { Link } from 'react-router-dom'

import { achievementName } from '@/features/gamification/achievement-catalog'
import { useMonthlyReport } from '@/features/gamification/queries'
import {
  currentReportMonth,
  formatMonthTitle,
} from '@/features/gamification/report-month'

/** Card "Seu mês" da tela inicial do aluno. Toque abre o relatório completo. */
export function MonthSummaryCard({ studentId }: { studentId: string }) {
  const month = currentReportMonth()
  const report = useMonthlyReport(studentId, month)

  return (
    <Link
      to="/app/resumo"
      className="block rounded-[1.5rem] bg-white p-5 text-slate-950 transition hover:bg-slate-50 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Seu mês
          </p>
          <h2 className="mt-1 text-lg font-bold">{formatMonthTitle(`${month}-01`)}</h2>
        </div>
        <ArrowRight className="text-slate-400" size={18} />
      </div>

      {report.isPending && (
        <p className="mt-4 text-sm text-slate-500">Carregando seu mês…</p>
      )}

      {report.isError && (
        <p className="mt-4 text-sm text-red-700">Não foi possível carregar seu mês.</p>
      )}

      {report.data && report.data.check_ins === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          Seu primeiro check-in acontece quando você finaliza um treino ou conclui uma
          aula.
        </p>
      )}

      {report.data && report.data.check_ins > 0 && (
        <dl className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs text-slate-500">Check-ins</dt>
            <dd className="mt-1 text-xl font-bold">{report.data.check_ins}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Sequência</dt>
            <dd className="mt-1 flex items-center gap-1 text-xl font-bold">
              <Flame className="text-orange-500" size={16} />
              {report.data.streak.current}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Próxima medalha</dt>
            <dd className="mt-1 text-sm font-semibold">
              {report.data.next_achievement
                ? achievementName(report.data.next_achievement.code)
                : 'Todas conquistadas'}
            </dd>
          </div>
        </dl>
      )}
    </Link>
  )
}
