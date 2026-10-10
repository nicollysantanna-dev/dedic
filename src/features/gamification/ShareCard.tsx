import { Flag, Star } from 'lucide-react'
import { Fragment, type Ref } from 'react'

import { achievementName } from '@/features/gamification/achievement-catalog'
import {
  addDays,
  calendarRows,
  formatMonthTitle,
  monthKey,
} from '@/features/gamification/report-month'
import type { MonthlyReport } from '@/features/gamification/schemas'
import {
  rarestMedals,
  shareSubtitle,
  shareTitle,
} from '@/features/gamification/report-share'

const weekdayLabels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

/**
 * Card 1080×1920 do resumo mensal, renderizado fora da tela e convertido em PNG.
 * Tamanho fixo de propósito: a imagem sai igual em qualquer aparelho.
 */
export function ShareCard({
  report,
  studentName,
  cardRef,
}: {
  report: MonthlyReport
  studentName: string
  cardRef: Ref<HTMLDivElement>
}) {
  const checkInDays = new Set(report.days.map((day) => day.day))
  const lessonDays = new Set(
    report.days.filter((day) => day.had_lesson).map((day) => day.day),
  )
  const medals = rarestMedals(report.achievements, report.month)
  const next = report.next_achievement

  return (
    <div
      ref={cardRef}
      style={{
        width: 1080,
        height: 1920,
        background: '#090f1f',
        color: '#ffffff',
        fontFamily: 'ui-monospace, Menlo, monospace',
        padding: '120px 96px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <p style={{ fontSize: 40, letterSpacing: 8, margin: 0, color: '#93c5fd' }}>DEDIC</p>

      <div
        style={{
          marginTop: 56,
          width: '100%',
          background: '#2f6fed',
          padding: '36px 0',
          textAlign: 'center',
          fontSize: 60,
          fontWeight: 800,
          letterSpacing: 6,
        }}
      >
        {shareTitle(report)}
      </div>

      <p style={{ fontSize: 38, color: '#cbd5e1', margin: '56px 0 0' }}>
        {formatMonthTitle(`${report.month}-01`)}
      </p>
      <p style={{ fontSize: 46, fontWeight: 700, margin: '12px 0 0' }}>{studentName}</p>

      <p style={{ fontSize: 150, fontWeight: 800, margin: '48px 0 0', lineHeight: 1 }}>
        {report.check_ins}
        <span style={{ fontSize: 56, marginLeft: 20, color: '#22c55e' }}>check-ins</span>
      </p>
      <p
        style={{
          fontSize: 36,
          color: '#cbd5e1',
          margin: '28px 0 0',
          textAlign: 'center',
        }}
      >
        {shareSubtitle(report)}
      </p>

      <div
        style={{
          marginTop: 72,
          width: '100%',
          background: '#111a2e',
          border: '3px solid #1e2b45',
          borderRadius: 24,
          padding: 36,
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr) 96px',
          gap: 12,
        }}
      >
        {weekdayLabels.map((label, index) => (
          <span
            key={`label-${index}`}
            style={{ textAlign: 'center', fontSize: 28, color: '#64748b' }}
          >
            {label}
          </span>
        ))}
        <span style={{ textAlign: 'center', fontSize: 26, color: '#facc15' }}>META</span>

        {calendarRows(report).map((week) => (
          <Fragment key={week.week_start}>
            {Array.from({ length: 7 }, (_, offset) =>
              addDays(week.week_start, offset),
            ).map((day) => {
              const inMonth = monthKey(day) === report.month
              const hasCheckIn = inMonth && checkInDays.has(day)
              return (
                <div
                  key={day}
                  style={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    borderRadius: 10,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 30,
                    background: hasCheckIn
                      ? '#22c55e'
                      : inMonth
                        ? '#0b1322'
                        : 'transparent',
                    border: inMonth && !hasCheckIn ? '2px solid #1e2b45' : 'none',
                    color: hasCheckIn ? '#052e16' : '#94a3b8',
                    fontWeight: hasCheckIn ? 800 : 400,
                  }}
                >
                  {inMonth ? Number(day.slice(8)) : ''}
                  {inMonth && lessonDays.has(day) && (
                    <Star
                      size={22}
                      fill="#facc15"
                      color="#facc15"
                      style={{ position: 'absolute', right: 4, top: 4 }}
                    />
                  )}
                </div>
              )
            })}
            <div style={{ display: 'grid', placeItems: 'center' }}>
              {week.met && <Flag size={44} fill="#facc15" color="#facc15" />}
            </div>
          </Fragment>
        ))}
      </div>

      <div
        style={{
          marginTop: 40,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '16px 40px',
          fontSize: 28,
          color: '#94a3b8',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{ width: 24, height: 24, borderRadius: 6, background: '#22c55e' }}
          />
          Check-in
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Star size={26} fill="#facc15" color="#facc15" />
          Com aula
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Flag size={26} fill="#facc15" color="#facc15" />
          Meta batida
        </span>
      </div>

      <div style={{ marginTop: 64, width: '100%', textAlign: 'center', fontSize: 36 }}>
        {medals.length > 0 ? (
          medals.map((medal) => (
            <p
              key={`${medal.code}-${medal.period_start ?? 'unica'}`}
              style={{ margin: '12px 0' }}
            >
              {achievementName(medal.code)}
            </p>
          ))
        ) : next ? (
          <p style={{ margin: 0, color: '#cbd5e1' }}>
            Próxima: {achievementName(next.code)} · {next.current}/{next.target}
          </p>
        ) : null}
      </div>

      <p
        style={{ marginTop: 'auto', fontSize: 40, color: '#e2e8f0', textAlign: 'center' }}
      >
        Um mês de treino. Uma conquista sua.
      </p>
    </div>
  )
}
