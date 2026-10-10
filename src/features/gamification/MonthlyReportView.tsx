import { Award, Flag, Flame, Star } from 'lucide-react'
import { Fragment } from 'react'

import {
  achievementDescription,
  achievementName,
} from '@/features/gamification/achievement-catalog'
import {
  addDays,
  checkInsRemaining,
  formatMonthTitle,
  monthKey,
  progressPercent,
  weekStartOf,
} from '@/features/gamification/report-month'
import type { MonthlyReport } from '@/features/gamification/schemas'
import { cn } from '@/lib/utils'

const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** Corpo do relatório mensal. Usado pelo aluno e, depois, pelo personal (só leitura). */
export function MonthlyReportView({
  report,
  today,
}: {
  report: MonthlyReport
  today: string
}) {
  const title = report.in_progress ? 'Até agora' : formatMonthTitle(`${report.month}-01`)

  if (report.check_ins === 0) {
    return (
      <section className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
        <MonthHeader title={title} checkIns={0} />
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          Seu primeiro check-in acontece quando você finaliza um treino ou conclui uma
          aula.
        </p>
      </section>
    )
  }

  const currentWeek = report.in_progress
    ? report.weeks.find((week) => week.week_start === weekStartOf(today))
    : undefined

  return (
    <section className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
      <MonthHeader title={title} checkIns={report.check_ins} />

      <CheckInCalendar report={report} />
      <p className="mt-2 text-[0.7rem] text-slate-500">
        Verde: dia com check-in · <Star className="inline" size={10} /> dia com aula ·{' '}
        <Flag className="inline" size={10} /> semana batida
      </p>

      {currentWeek && (
        <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
          {currentWeek.met
            ? 'Semana atual batida.'
            : `Faltam ${pluralCheckIns(checkInsRemaining(currentWeek))} para bater a meta desta semana.`}
        </p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Sequência atual</dt>
          <dd className="mt-1 flex items-center gap-1 text-lg font-bold">
            <Flame className="text-orange-500" size={16} /> {report.streak.current}{' '}
            {report.streak.current === 1 ? 'semana' : 'semanas'}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Recorde</dt>
          <dd className="mt-1 text-lg font-bold">
            {report.streak.best} {report.streak.best === 1 ? 'semana' : 'semanas'}
          </dd>
        </div>
      </dl>

      {report.next_achievement && (
        <NextAchievement
          code={report.next_achievement.code}
          current={report.next_achievement.current}
          target={report.next_achievement.target}
        />
      )}

      {report.achievements.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-bold">Medalhas</h3>
          <ul className="mt-2 space-y-2">
            {report.achievements.map((achievement) => (
              <li
                key={`${achievement.code}-${achievement.period_start ?? 'unica'}`}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
              >
                <Award className="shrink-0 text-amber-500" size={18} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {achievementName(achievement.code)}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {achievementDescription(achievement.code)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-5 text-sm text-slate-600">
        Aulas concluídas no mês:{' '}
        <span className="font-bold">{report.lessons_completed}</span>
      </p>
    </section>
  )
}

function MonthHeader({ title, checkIns }: { title: string; checkIns: number }) {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Seu mês
      </p>
      <h2 className="mt-1 text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{pluralCheckIns(checkIns)} no mês</p>
    </header>
  )
}

function CheckInCalendar({ report }: { report: MonthlyReport }) {
  const checkInDays = new Set(report.days.map((day) => day.day))
  const lessonDays = new Set(
    report.days.filter((day) => day.had_lesson).map((day) => day.day),
  )

  return (
    <div
      className="mt-4 grid grid-cols-[repeat(7,minmax(0,1fr))_2.25rem] gap-1 text-center"
      role="grid"
      aria-label="Calendário de check-ins do mês"
    >
      {weekdayLabels.map((label) => (
        <span key={label} className="text-[0.65rem] font-semibold text-slate-400">
          {label}
        </span>
      ))}
      <span className="text-[0.65rem] font-semibold text-slate-400">Meta</span>

      {report.weeks.map((week) => (
        <Fragment key={week.week_start}>
          {Array.from({ length: 7 }, (_, offset) => addDays(week.week_start, offset)).map(
            (day) => {
              const inMonth = monthKey(day) === report.month
              const hasCheckIn = inMonth && checkInDays.has(day)
              return (
                <span
                  key={day}
                  className={cn(
                    'relative grid aspect-square place-items-center rounded-md text-xs',
                    !inMonth && 'text-transparent',
                    inMonth && !hasCheckIn && 'bg-slate-100 text-slate-500',
                    hasCheckIn && 'bg-emerald-500 font-bold text-white',
                  )}
                >
                  {inMonth ? Number(day.slice(8)) : ''}
                  {inMonth && lessonDays.has(day) && (
                    <Star className="absolute right-0.5 top-0.5" size={8} />
                  )}
                </span>
              )
            },
          )}
          <span className="grid place-items-center">
            {week.met && <Flag className="text-blue-600" size={14} />}
          </span>
        </Fragment>
      ))}
    </div>
  )
}

function NextAchievement({
  code,
  current,
  target,
}: {
  code: string
  current: number
  target: number
}) {
  const percent = progressPercent(current, target)
  const name = achievementName(code)
  return (
    <div className="mt-5">
      <p className="text-sm font-bold">Próxima medalha</p>
      <p className="mt-1 text-xs text-slate-500">
        {name}: {current} de {target}
      </p>
      <div
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-[var(--brand)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function pluralCheckIns(count: number) {
  return `${count} ${count === 1 ? 'check-in' : 'check-ins'}`
}
