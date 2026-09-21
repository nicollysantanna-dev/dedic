import { ChevronDown, ChevronUp, Trophy } from 'lucide-react'
import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { exerciseMediaFrom } from '@/features/workouts/exercise-media'
import { ExerciseThumb } from '@/features/workouts/ExercisePicker'
import { formatKg } from '@/features/workouts/workout-math'
import {
  useExerciseLoadHistory,
  useExerciseRecords,
  workoutExerciseName,
  type ExerciseRecord,
} from '@/features/workouts/workout-queries'
import { formatDateOnly, formatDateTime } from '@/lib/format'

/** Recordes por exercício: carga, 1RM estimado e volume; toque abre a curva de carga. */
export function ExerciseRecordsSection({
  studentId,
  trainerId,
  limit,
}: {
  studentId: string
  trainerId: string | null
  limit?: number
}) {
  const records = useExerciseRecords(studentId)

  if (records.isLoading) {
    return <p className="p-6 text-center text-sm text-slate-400">Carregando recordes…</p>
  }
  if (records.error) {
    return (
      <p className="rounded-2xl bg-red-400/10 p-4 text-sm text-red-100" role="alert">
        Não foi possível carregar os recordes.
      </p>
    )
  }
  const items = [...(records.data ?? [])]
    .sort((left, right) => Number(right.best_weight_kg) - Number(left.best_weight_kg))
    .slice(0, limit)
  if (items.length === 0) {
    return (
      <p className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 p-8 text-center text-sm text-slate-400">
        Os recordes aparecem depois do primeiro treino finalizado com carga.
      </p>
    )
  }
  return (
    <ul className="grid gap-3">
      {items.map((record) => (
        <li key={record.exercise_id}>
          <RecordCard record={record} studentId={studentId} trainerId={trainerId} />
        </li>
      ))}
    </ul>
  )
}

function RecordCard({
  record,
  studentId,
  trainerId,
}: {
  record: ExerciseRecord
  studentId: string
  trainerId: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const name = record.exercise
    ? workoutExerciseName(record.exercise, trainerId)
    : 'Exercício'
  return (
    <article className="rounded-[1.5rem] bg-white p-4 text-slate-950 sm:p-5">
      <div className="flex items-center gap-3">
        {record.exercise && (
          <ExerciseThumb
            media={exerciseMediaFrom(record.exercise, trainerId)}
            name={name}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="text-xs text-slate-500">
            {record.sessions_count} treino{record.sessions_count === 1 ? '' : 's'} ·
            último em{' '}
            {record.last_performed_at ? formatDateTime(record.last_performed_at) : '—'}
          </p>
        </div>
        <button
          aria-expanded={expanded}
          aria-label={expanded ? `Recolher ${name}` : `Ver evolução de ${name}`}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <RecordStat
          label="Maior carga"
          value={formatKg(Number(record.best_weight_kg ?? 0))}
        />
        <RecordStat
          label="1RM estimado"
          value={formatKg(Number(record.best_one_rm ?? 0))}
        />
        <RecordStat
          label="Volume em série"
          value={formatKg(Number(record.best_volume ?? 0))}
        />
      </dl>
      {expanded && record.exercise_id && (
        <LoadChart exerciseId={record.exercise_id} studentId={studentId} />
      )}
    </article>
  )
}

function RecordStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-amber-50 px-2 py-2">
      <dt className="flex items-center justify-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-800">
        <Trophy size={11} /> {label}
      </dt>
      <dd className="mt-0.5 text-sm font-bold text-slate-900">{value}</dd>
    </div>
  )
}

/** Maior carga por treino ao longo do tempo. */
export function LoadChart({
  studentId,
  exerciseId,
}: {
  studentId: string
  exerciseId: string
}) {
  const history = useExerciseLoadHistory(studentId, exerciseId)
  const series = (history.data ?? []).map((item) => ({
    date: item.finished_at?.slice(0, 10) ?? '',
    weightKg: Number(item.max_weight_kg ?? 0),
    oneRm: Number(item.best_one_rm ?? 0),
  }))
  if (history.isLoading) {
    return <p className="mt-3 text-xs text-slate-500">Carregando evolução…</p>
  }
  if (series.length < 2) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        A curva de carga aparece a partir do segundo treino com este exercício.
      </p>
    )
  }
  return (
    <div className="mt-4 h-44" aria-label="Evolução da carga">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDateOnly(value).slice(0, 5)}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={['dataMin - 2', 'dataMax + 2']}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, key) => [
              `${Number(value).toLocaleString('pt-BR')} kg`,
              key === 'oneRm' ? '1RM estimado' : 'Maior carga',
            ]}
            labelFormatter={(value) =>
              typeof value === 'string' ? formatDateOnly(value) : ''
            }
          />
          <Line
            type="monotone"
            dataKey="weightKg"
            stroke="var(--brand)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--brand)' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="oneRm"
            stroke="#f59e0b"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
