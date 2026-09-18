import { Camera, LoaderCircle, Plus, Scale, Target, Trash2, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { prepareImage } from '@/features/progress/image'
import {
  buildWeightSeries,
  daysUntil,
  goalProgress,
  latestMeasurements,
  measurementFields,
  type MeasurementKey,
} from '@/features/progress/progress-summary'
import {
  useAddProgressEntry,
  useCreateGoal,
  useDeletePhoto,
  useGoals,
  usePhotoUrl,
  usePhotos,
  useProgressEntries,
  useUpdateGoalStatus,
  useUploadPhoto,
} from '@/features/progress/queries'
import { formatDateOnly, toIsoDate } from '@/lib/format'
import type { Tables } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'

type Photo = Tables<'progress_photos'>
type Position = Photo['position']

const positionLabels: Record<Position, string> = {
  front: 'Frente',
  side: 'Lateral',
  back: 'Costas',
}

const goalKindLabels = { weight: 'Peso', attendance: 'Frequência' }
const goalUnits = { weight: 'kg', attendance: 'aulas/semana' }

/**
 * Evolução física de um aluno. O aluno registra peso/medidas e envia/exclui fotos;
 * o personal registra peso/medidas, define metas e visualiza as fotos.
 */
export function ProgressSection({
  studentId,
  viewerId,
  viewerRole,
}: {
  studentId: string
  viewerId: string
  viewerRole: 'student' | 'trainer'
}) {
  const entries = useProgressEntries(studentId)
  const goals = useGoals(studentId)
  const photos = usePhotos(studentId)
  const isStudent = viewerRole === 'student'

  const series = useMemo(() => buildWeightSeries(entries.data ?? []), [entries.data])
  const latest = useMemo(() => latestMeasurements(entries.data ?? []), [entries.data])
  const currentWeight = series.at(-1)?.weightKg ?? null
  const loading = entries.isLoading || goals.isLoading || photos.isLoading
  const error = entries.error || goals.error || photos.error

  if (loading) {
    return (
      <p className="rounded-2xl border border-white/8 bg-white/5 p-6 text-center text-sm text-slate-300">
        Carregando evolução…
      </p>
    )
  }
  if (error) {
    return (
      <p className="rounded-2xl bg-red-400/10 p-4 text-sm text-red-100" role="alert">
        Não foi possível carregar a evolução.
      </p>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-5">
        <WeightCard
          series={series}
          latest={latest}
          studentId={studentId}
          viewerId={viewerId}
        />
        <PhotosCard
          photos={photos.data ?? []}
          studentId={studentId}
          canManage={isStudent}
        />
      </div>
      <GoalsCard
        goals={goals.data ?? []}
        currentWeight={currentWeight}
        studentId={studentId}
        trainerId={isStudent ? null : viewerId}
      />
    </div>
  )
}

function WeightCard({
  series,
  latest,
  studentId,
  viewerId,
}: {
  series: { date: string; weightKg: number }[]
  latest: ReturnType<typeof latestMeasurements>
  studentId: string
  viewerId: string
}) {
  const [isAdding, setIsAdding] = useState(false)
  const current = series.at(-1)
  const first = series[0]
  const delta =
    current && first && series.length > 1 ? current.weightKg - first.weightKg : null

  return (
    <section className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="text-[var(--brand)]" size={19} />
            <h2 className="text-lg font-bold">Peso e medidas</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {current
              ? `${current.weightKg.toLocaleString('pt-BR')} kg em ${formatDateOnly(current.date)}`
              : 'Nenhum peso registrado ainda.'}
            {delta !== null && (
              <span
                className={cn(
                  'ml-2 font-semibold',
                  delta <= 0 ? 'text-emerald-700' : 'text-amber-700',
                )}
              >
                {delta > 0 ? '+' : ''}
                {delta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg no
                período
              </span>
            )}
          </p>
        </div>
        <Button
          className="h-10 px-3 text-xs"
          onClick={() => setIsAdding(true)}
          variant="outline"
        >
          <Plus size={15} /> Registrar
        </Button>
      </div>

      {series.length >= 2 ? (
        <div className="mt-5 h-52">
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
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [
                  `${Number(value).toLocaleString('pt-BR')} kg`,
                  'Peso',
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          O gráfico aparece a partir do segundo registro de peso.
        </p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {measurementFields.map((field) => {
          const measurement = latest[field.key]
          return (
            <div key={field.key} className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">{field.label}</dt>
              <dd className="mt-1 font-bold">
                {measurement ? `${measurement.value.toLocaleString('pt-BR')} cm` : '—'}
              </dd>
            </div>
          )
        })}
      </dl>

      {isAdding && (
        <ProgressEntryDialog
          studentId={studentId}
          viewerId={viewerId}
          onClose={() => setIsAdding(false)}
        />
      )}
    </section>
  )
}

function ProgressEntryDialog({
  studentId,
  viewerId,
  onClose,
}: {
  studentId: string
  viewerId: string
  onClose: () => void
}) {
  const [recordedOn, setRecordedOn] = useState(toIsoDate(new Date()))
  const [weight, setWeight] = useState('')
  const [measurements, setMeasurements] = useState<Record<MeasurementKey, string>>({
    chest_cm: '',
    waist_cm: '',
    hips_cm: '',
    arm_cm: '',
    thigh_cm: '',
  })
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const add = useAddProgressEntry(studentId)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    const weightKg = weight ? Number(weight.replace(',', '.')) : null
    const parsedMeasurements: Record<string, number> = {}
    for (const field of measurementFields) {
      const raw = measurements[field.key]
      if (!raw) continue
      const value = Number(raw.replace(',', '.'))
      if (!Number.isFinite(value) || value <= 0 || value > 300) {
        setFormError(`Informe uma medida válida para ${field.label.toLowerCase()}.`)
        return
      }
      parsedMeasurements[field.key] = value
    }
    if (
      weightKg !== null &&
      (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400)
    ) {
      setFormError('Informe um peso entre 20 e 400 kg.')
      return
    }
    if (weightKg === null && Object.keys(parsedMeasurements).length === 0) {
      setFormError('Informe o peso ou pelo menos uma medida.')
      return
    }
    add.mutate(
      {
        recordedOn,
        weightKg,
        measurements: parsedMeasurements,
        note,
        recordedBy: viewerId,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog
      title="Registrar peso e medidas"
      eyebrow="Evolução"
      onClose={onClose}
      pending={add.isPending}
    >
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Data
            <input
              className="field mt-2"
              max={toIsoDate(new Date())}
              onChange={(event) => setRecordedOn(event.target.value)}
              required
              type="date"
              value={recordedOn}
            />
          </label>
          <label className="block text-sm font-semibold">
            Peso (kg)
            <input
              className="field mt-2"
              inputMode="decimal"
              onChange={(event) => setWeight(event.target.value)}
              placeholder="Ex.: 68,5"
              value={weight}
            />
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Medidas (cm, opcionais)</legend>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {measurementFields.map((field) => (
              <label
                key={field.key}
                className="block text-xs font-semibold text-slate-600"
              >
                {field.label}
                <input
                  className="field mt-1"
                  inputMode="decimal"
                  onChange={(event) =>
                    setMeasurements((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  value={measurements[field.key]}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-semibold">
          Observação (opcional)
          <input
            className="field mt-2"
            maxLength={240}
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </label>
        {(formError || add.error) && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {formError || 'Não foi possível salvar o registro. Tente novamente.'}
          </p>
        )}
        <Button className="w-full" disabled={add.isPending} type="submit">
          {add.isPending && <LoaderCircle className="animate-spin" size={17} />}
          Salvar registro
        </Button>
      </form>
    </Dialog>
  )
}

function GoalsCard({
  goals,
  currentWeight,
  studentId,
  trainerId,
}: {
  goals: Tables<'student_goals'>[]
  currentWeight: number | null
  studentId: string
  trainerId: string | null
}) {
  const [isCreating, setIsCreating] = useState(false)
  const updateStatus = useUpdateGoalStatus(studentId)
  const active = goals.filter((goal) => goal.status === 'active')
  const finished = goals.filter((goal) => goal.status !== 'active')

  return (
    <section className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Target className="text-[var(--brand)]" size={19} />
          <h2 className="text-lg font-bold">Metas</h2>
        </div>
        {trainerId && (
          <Button
            className="h-10 px-3 text-xs"
            onClick={() => setIsCreating(true)}
            variant="outline"
          >
            <Plus size={15} /> Nova meta
          </Button>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {active.map((goal) => {
          const current = goal.kind === 'weight' ? currentWeight : null
          const progress = goalProgress(goal, current)
          const days = daysUntil(goal.target_date)
          return (
            <li key={goal.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">
                  {goalKindLabels[goal.kind]}:{' '}
                  {Number(goal.initial_value).toLocaleString('pt-BR')} →{' '}
                  {Number(goal.target_value).toLocaleString('pt-BR')}{' '}
                  {goalUnits[goal.kind]}
                </p>
                <span className="text-sm font-bold text-[var(--brand)]">{progress}%</span>
              </div>
              <div
                aria-label={`Progresso da meta: ${progress}%`}
                className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[var(--brand)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p
                className={cn(
                  'mt-2 text-xs',
                  days < 0 ? 'text-amber-700' : 'text-slate-500',
                )}
              >
                {days < 0
                  ? `Prazo vencido há ${Math.abs(days)} dias`
                  : days === 0
                    ? 'Prazo termina hoje'
                    : `${days} dias até ${formatDateOnly(goal.target_date)}`}
                {goal.kind === 'attendance' && ' · acompanhada pelas aulas realizadas'}
              </p>
              {trainerId && (
                <div className="mt-3 flex gap-2">
                  <Button
                    className="h-8 px-3 text-xs"
                    disabled={updateStatus.isPending}
                    onClick={() =>
                      updateStatus.mutate({ goalId: goal.id, status: 'achieved' })
                    }
                    variant="outline"
                  >
                    Concluída
                  </Button>
                  <Button
                    className="h-8 px-3 text-xs"
                    disabled={updateStatus.isPending}
                    onClick={() =>
                      updateStatus.mutate({ goalId: goal.id, status: 'abandoned' })
                    }
                    variant="ghost"
                  >
                    Encerrar
                  </Button>
                </div>
              )}
            </li>
          )
        })}
        {!active.length && (
          <li className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            {trainerId
              ? 'Defina uma meta de peso ou frequência com prazo para este aluno.'
              : 'Seu personal ainda não definiu metas.'}
          </li>
        )}
      </ul>

      {finished.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold text-slate-600">
            Metas encerradas ({finished.length})
          </summary>
          <ul className="mt-2 space-y-1 text-slate-500">
            {finished.map((goal) => (
              <li key={goal.id}>
                {goalKindLabels[goal.kind]}{' '}
                {Number(goal.initial_value).toLocaleString('pt-BR')} →{' '}
                {Number(goal.target_value).toLocaleString('pt-BR')} ·{' '}
                {goal.status === 'achieved' ? 'concluída' : 'encerrada'}
              </li>
            ))}
          </ul>
        </details>
      )}

      {isCreating && trainerId && (
        <GoalDialog
          studentId={studentId}
          trainerId={trainerId}
          currentWeight={currentWeight}
          onClose={() => setIsCreating(false)}
        />
      )}
    </section>
  )
}

function GoalDialog({
  studentId,
  trainerId,
  currentWeight,
  onClose,
}: {
  studentId: string
  trainerId: string
  currentWeight: number | null
  onClose: () => void
}) {
  const [kind, setKind] = useState<Tables<'student_goals'>['kind']>('weight')
  const [initialValue, setInitialValue] = useState(
    currentWeight ? String(currentWeight) : '',
  )
  const [targetValue, setTargetValue] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [formError, setFormError] = useState('')
  const create = useCreateGoal(studentId)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    const initial = Number(initialValue.replace(',', '.'))
    const target = Number(targetValue.replace(',', '.'))
    if (!Number.isFinite(initial) || !Number.isFinite(target) || initial === target) {
      setFormError('Informe valores inicial e alvo diferentes.')
      return
    }
    if (!targetDate || targetDate < toIsoDate(new Date())) {
      setFormError('Escolha uma data-alvo a partir de hoje.')
      return
    }
    create.mutate(
      { trainerId, kind, initialValue: initial, targetValue: target, targetDate },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog
      title="Nova meta"
      eyebrow="Evolução"
      onClose={onClose}
      pending={create.isPending}
    >
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-semibold">
          Tipo
          <select
            className="field mt-2"
            onChange={(event) =>
              setKind(event.target.value as Tables<'student_goals'>['kind'])
            }
            value={kind}
          >
            <option value="weight">Peso (kg)</option>
            <option value="attendance">Frequência (aulas por semana)</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Valor inicial
            <input
              className="field mt-2"
              inputMode="decimal"
              onChange={(event) => setInitialValue(event.target.value)}
              required
              value={initialValue}
            />
          </label>
          <label className="block text-sm font-semibold">
            Valor-alvo
            <input
              className="field mt-2"
              inputMode="decimal"
              onChange={(event) => setTargetValue(event.target.value)}
              required
              value={targetValue}
            />
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Data-alvo
          <input
            className="field mt-2"
            min={toIsoDate(new Date())}
            onChange={(event) => setTargetDate(event.target.value)}
            required
            type="date"
            value={targetDate}
          />
        </label>
        {(formError || create.error) && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {formError || 'Não foi possível salvar a meta. Tente novamente.'}
          </p>
        )}
        <Button className="w-full" disabled={create.isPending} type="submit">
          {create.isPending && <LoaderCircle className="animate-spin" size={17} />}
          Salvar meta
        </Button>
      </form>
    </Dialog>
  )
}

function PhotosCard({
  photos,
  studentId,
  canManage,
}: {
  photos: Photo[]
  studentId: string
  canManage: boolean
}) {
  const [compare, setCompare] = useState<[string | null, string | null]>([null, null])
  const upload = useUploadPhoto(studentId)
  const remove = useDeletePhoto(studentId)
  const [uploadError, setUploadError] = useState('')
  const [takenOn, setTakenOn] = useState(toIsoDate(new Date()))
  const [position, setPosition] = useState<Position>('front')

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadError('')
    try {
      const prepared = await prepareImage(file)
      await upload.mutateAsync({ file: prepared, takenOn, position })
    } catch {
      setUploadError('Não foi possível enviar a foto. Tente novamente.')
    }
  }

  const selected = compare.map((id) => photos.find((photo) => photo.id === id) ?? null)

  return (
    <section className="rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
      <div className="flex items-center gap-2">
        <Camera className="text-[var(--brand)]" size={19} />
        <h2 className="text-lg font-bold">Fotos de evolução</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Visíveis apenas para você e seu personal.{' '}
        {canManage && 'Você pode excluí-las quando quiser.'}
      </p>

      {canManage && (
        <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-xs font-semibold text-slate-600">
            Data da foto
            <input
              className="field mt-1"
              max={toIsoDate(new Date())}
              onChange={(event) => setTakenOn(event.target.value)}
              type="date"
              value={takenOn}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Posição
            <select
              className="field mt-1"
              onChange={(event) => setPosition(event.target.value as Position)}
              value={position}
            >
              {(Object.keys(positionLabels) as Position[]).map((value) => (
                <option key={value} value={value}>
                  {positionLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Enviar foto</span>
            <input
              accept="image/*"
              className="sr-only"
              data-testid="photo-input"
              disabled={upload.isPending}
              onChange={(event) => void onFileChange(event)}
              type="file"
            />
            <span
              className={cn(
                'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)]',
                upload.isPending && 'pointer-events-none opacity-60',
              )}
            >
              {upload.isPending ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <Camera size={17} />
              )}
              Enviar foto
            </span>
          </label>
        </div>
      )}
      {uploadError && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
          {uploadError}
        </p>
      )}

      {photos.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          {canManage
            ? 'Envie a primeira foto para começar a comparar sua evolução.'
            : 'Nenhuma foto enviada ainda.'}
        </p>
      ) : (
        <>
          <p className="mt-4 text-xs text-slate-500">
            Toque em duas fotos para compará-las lado a lado.
          </p>
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((photo) => (
              <li key={photo.id}>
                <PhotoThumb
                  photo={photo}
                  selectedIndex={compare.indexOf(photo.id)}
                  onSelect={() =>
                    setCompare((current) => {
                      if (current.includes(photo.id)) {
                        return current.map((id) =>
                          id === photo.id ? null : id,
                        ) as typeof current
                      }
                      if (current[0] === null) return [photo.id, current[1]]
                      return [current[0], photo.id]
                    })
                  }
                  onDelete={
                    canManage
                      ? () => {
                          if (
                            window.confirm(
                              'Excluir esta foto? Esta ação não pode ser desfeita.',
                            )
                          ) {
                            remove.mutate(photo)
                          }
                        }
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
          {remove.error && (
            <p
              className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              Não foi possível excluir a foto.
            </p>
          )}
          {selected[0] && selected[1] && (
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Comparação</h3>
                <button
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  onClick={() => setCompare([null, null])}
                  type="button"
                >
                  Limpar
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {selected.map((photo) => (
                  <figure
                    key={photo!.id}
                    className="overflow-hidden rounded-xl bg-slate-100"
                  >
                    <PhotoImage
                      path={photo!.storage_path}
                      alt={positionLabels[photo!.position]}
                    />
                    <figcaption className="p-2 text-center text-xs text-slate-600">
                      {formatDateOnly(photo!.taken_on)} ·{' '}
                      {positionLabels[photo!.position]}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function PhotoThumb({
  photo,
  selectedIndex,
  onSelect,
  onDelete,
}: {
  photo: Photo
  selectedIndex: number
  onSelect: () => void
  onDelete?: () => void
}) {
  return (
    <div className="relative">
      <button
        aria-pressed={selectedIndex >= 0}
        className={cn(
          'block w-full overflow-hidden rounded-xl border-2 bg-slate-100 text-left transition',
          selectedIndex >= 0 ? 'border-[var(--brand)]' : 'border-transparent',
        )}
        onClick={onSelect}
        type="button"
      >
        <PhotoImage path={photo.storage_path} alt={positionLabels[photo.position]} />
        <span className="block px-2 py-1 text-[0.65rem] text-slate-600">
          {formatDateOnly(photo.taken_on)} · {positionLabels[photo.position]}
        </span>
      </button>
      {selectedIndex >= 0 && (
        <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[0.65rem] font-bold text-white">
          {selectedIndex + 1}
        </span>
      )}
      {onDelete && (
        <button
          aria-label={`Excluir foto de ${formatDateOnly(photo.taken_on)}`}
          className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/90 text-red-600 shadow hover:bg-white"
          onClick={onDelete}
          type="button"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

function PhotoImage({ path, alt }: { path: string; alt: string }) {
  const url = usePhotoUrl(path)
  if (url.error) {
    return (
      <div className="grid aspect-[3/4] place-items-center text-xs text-slate-500">
        Indisponível
      </div>
    )
  }
  if (!url.data) return <div className="aspect-[3/4] animate-pulse bg-slate-200" />
  return <img alt={alt} className="aspect-[3/4] w-full object-cover" src={url.data} />
}

function Dialog({
  title,
  eyebrow,
  onClose,
  pending,
  children,
}: {
  title: string
  eyebrow: string
  onClose: () => void
  pending: boolean
  children: React.ReactNode
}) {
  const titleId = `dialog-${title.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div
      className="fixed inset-0 z-50 grid items-end bg-slate-950/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-5 text-slate-950 shadow-2xl sm:max-w-lg sm:rounded-[1.75rem] sm:p-6"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em]" id={titleId}>
              {title}
            </h2>
          </div>
          <button
            aria-label="Fechar"
            className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
