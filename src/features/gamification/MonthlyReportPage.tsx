import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/features/auth/auth-context'
import { useFirstCheckInDay, useMonthlyReport } from '@/features/gamification/queries'
import { MonthlyReportView } from '@/features/gamification/MonthlyReportView'
import { ShareCard } from '@/features/gamification/ShareCard'
import {
  deliverCard,
  renderCardBlob,
  shareButtonLabel,
} from '@/features/gamification/share-image'
import { shareFileName } from '@/features/gamification/report-share'
import {
  currentReportMonth,
  formatMonthTitle,
  monthKey,
  monthsBetween,
  parseReportMonth,
  todayInSaoPaulo,
} from '@/features/gamification/report-month'
import { gamificationKeys } from '@/features/gamification/keys'

export function MonthlyReportPage() {
  const { profile } = useAuth()
  const { month: monthParam } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cardRef = useRef<HTMLDivElement>(null)
  const [shareError, setShareError] = useState('')
  const [sharing, setSharing] = useState(false)

  const studentId = profile?.id ?? ''
  const today = todayInSaoPaulo()
  const currentMonth = currentReportMonth()
  const invalidMonth = monthParam !== undefined && parseReportMonth(monthParam) === null
  const month = invalidMonth || !monthParam ? currentMonth : monthParam

  const firstDay = useFirstCheckInDay(studentId)
  const report = useMonthlyReport(studentId, month)

  if (!profile) return null
  if (invalidMonth) return <Navigate to="/app/resumo" replace />

  // Meses do primeiro check-in até o atual; inclui o mês da URL mesmo se for anterior.
  const firstMonth = firstDay.data ? monthKey(firstDay.data) : month
  const startMonth = month < firstMonth ? month : firstMonth
  const monthOptions = monthsBetween(startMonth, currentMonth)

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-2xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">Sua constância no mês</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              Meu resumo
            </h1>
          </div>
          <label className="block text-xs font-semibold text-slate-300">
            Mês
            <select
              className="field mt-1 min-w-48"
              onChange={(event) => {
                void navigate(`/app/resumo/${event.target.value}`)
              }}
              value={month}
            >
              {monthOptions.map((option) => (
                <option key={option} value={option}>
                  {formatMonthTitle(`${option}-01`)}
                </option>
              ))}
            </select>
          </label>
        </header>

        <div className="mt-6">
          {report.isPending && (
            <p className="rounded-[1.5rem] bg-white/5 p-5 text-sm text-slate-300">
              Carregando seu resumo…
            </p>
          )}

          {report.isError && (
            <div className="rounded-[1.5rem] bg-white p-5 text-slate-950">
              <p className="text-sm text-red-700" role="alert">
                Não foi possível carregar este mês.
              </p>
              <button
                className="mt-3 min-h-11 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white"
                onClick={() =>
                  void queryClient.invalidateQueries({
                    queryKey: gamificationKeys.report(studentId, month),
                  })
                }
                type="button"
              >
                Tentar de novo
              </button>
            </div>
          )}

          {report.data && <MonthlyReportView report={report.data} today={today} />}

          {/* Compartilhar vale para qualquer mês com check-ins, inclusive o em andamento; o card é gerado fora da tela. */}
          {report.data && report.data.check_ins > 0 && (
            <div className="mt-4">
              <button
                className="min-h-12 w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                disabled={sharing}
                onClick={() => {
                  void (async () => {
                    if (!cardRef.current) return
                    setSharing(true)
                    setShareError('')
                    try {
                      const blob = await renderCardBlob(cardRef.current)
                      await deliverCard(blob, shareFileName(month))
                    } catch {
                      setShareError('Não foi possível gerar a imagem. Tente novamente.')
                    } finally {
                      setSharing(false)
                    }
                  })()
                }}
                type="button"
              >
                {sharing ? 'Gerando imagem…' : shareButtonLabel()}
              </button>
              {shareError && (
                <p className="mt-2 text-sm text-red-300" role="alert">
                  {shareError}
                </p>
              )}
              {/* 1080px de largura: fica longe da tela para não sobrepor o conteúdo. */}
              <div
                aria-hidden="true"
                className="pointer-events-none fixed top-0 left-[-10000px]"
              >
                {report.data && (
                  <ShareCard
                    cardRef={cardRef}
                    report={report.data}
                    studentName={profile.full_name}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
