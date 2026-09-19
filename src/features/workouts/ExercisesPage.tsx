import { Dumbbell, LoaderCircle, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/auth-context'
import { ExerciseCard } from '@/features/workouts/ExerciseCard'
import {
  useCreateCustomExercise,
  useExerciseSearch,
  useSaveExerciseAlias,
  type ExerciseSearchResult,
} from '@/features/workouts/queries'
import {
  bodyPartLabels,
  equipmentLabels,
  muscleLabels,
} from '@/features/workouts/vocabulary'

export function ExercisesPage() {
  const { profile } = useAuth()
  const [term, setTerm] = useState('')
  const [bodyPart, setBodyPart] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<string | null>(null)
  const [aliasTarget, setAliasTarget] = useState<ExerciseSearchResult | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const trainerId = profile?.id ?? ''
  const results = useExerciseSearch({ term, bodyPart, equipment })

  if (profile?.role !== 'trainer') return <Navigate to="/app" replace />

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Biblioteca para montar fichas</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              Exercícios
            </h1>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus size={17} /> Criar exercício
          </Button>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={17}
            />
            <span className="sr-only">Buscar exercício</span>
            <input
              className="field field-dark pl-10"
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Buscar por nome (ex.: supino, rosca, squat)"
              type="search"
              value={term}
            />
          </label>
          <label className="block">
            <span className="sr-only">Parte do corpo</span>
            <select
              className="field field-dark"
              onChange={(event) => setBodyPart(event.target.value || null)}
              value={bodyPart ?? ''}
            >
              <option value="">Todas as partes</option>
              {Object.entries(bodyPartLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Equipamento</span>
            <select
              className="field field-dark"
              onChange={(event) => setEquipment(event.target.value || null)}
              value={equipment ?? ''}
            >
              <option value="">Todos os equipamentos</option>
              {Object.entries(equipmentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {results.isLoading && (
          <p className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-8 text-center text-sm text-slate-300">
            Carregando exercícios…
          </p>
        )}
        {results.error && (
          <p
            className="mt-6 rounded-2xl bg-red-400/10 p-4 text-sm text-red-100"
            role="alert"
          >
            Não foi possível buscar os exercícios.
          </p>
        )}
        {results.data && (
          <>
            <p className="mt-6 text-xs text-slate-400">
              {results.data.length === 60
                ? 'Mostrando os 60 primeiros — refine a busca para ver outros.'
                : `${results.data.length} exercício${results.data.length === 1 ? '' : 's'}`}
            </p>
            <ul className="mt-3 space-y-2">
              {results.data.map((exercise) => (
                <li key={exercise.id}>
                  <ExerciseCard exercise={exercise} onAlias={setAliasTarget} />
                </li>
              ))}
              {results.data.length === 0 && (
                <li className="rounded-[1.25rem] border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center">
                  <Dumbbell className="mx-auto text-blue-400" size={28} />
                  <p className="mt-3 font-semibold">Nenhum exercício encontrado.</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Tente em inglês ou crie um exercício personalizado.
                  </p>
                </li>
              )}
            </ul>
          </>
        )}

        {aliasTarget && (
          <AliasDialog
            exercise={aliasTarget}
            trainerId={trainerId}
            onClose={() => setAliasTarget(null)}
          />
        )}
        {isCreating && (
          <CustomExerciseDialog
            trainerId={trainerId}
            onClose={() => setIsCreating(false)}
          />
        )}
      </div>
    </main>
  )
}

function AliasDialog({
  exercise,
  trainerId,
  onClose,
}: {
  exercise: ExerciseSearchResult
  trainerId: string
  onClose: () => void
}) {
  const [alias, setAlias] = useState(exercise.alias ?? '')
  const save = useSaveExerciseAlias(trainerId)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate({ exerciseId: exercise.id, alias }, { onSuccess: onClose })
  }

  return (
    <Dialog
      title="Apelidar exercício"
      eyebrow="Biblioteca"
      onClose={onClose}
      pending={save.isPending}
    >
      <p className="mt-2 text-sm text-slate-500">
        O apelido aparece para você e para seus alunos no lugar de{' '}
        <strong>{exercise.name_pt ?? exercise.name_en}</strong>.
      </p>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-semibold">
          Apelido
          <input
            autoFocus
            className="field mt-2"
            maxLength={120}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="Deixe vazio para remover"
            value={alias}
          />
        </label>
        {save.error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            Não foi possível salvar o apelido.
          </p>
        )}
        <Button className="w-full" disabled={save.isPending} type="submit">
          {save.isPending && <LoaderCircle className="animate-spin" size={17} />}
          Salvar apelido
        </Button>
      </form>
    </Dialog>
  )
}

function CustomExerciseDialog({
  trainerId,
  onClose,
}: {
  trainerId: string
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [bodyPart, setBodyPart] = useState('upper legs')
  const [equipment, setEquipment] = useState('body weight')
  const [muscle, setMuscle] = useState('quads')
  const [formError, setFormError] = useState('')
  const create = useCreateCustomExercise(trainerId)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (name.trim().length < 2) {
      setFormError('Informe o nome do exercício.')
      return
    }
    create.mutate(
      {
        name: name.trim(),
        bodyParts: [bodyPart],
        equipments: [equipment],
        targetMuscles: [muscle],
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog
      title="Criar exercício"
      eyebrow="Biblioteca"
      onClose={onClose}
      pending={create.isPending}
    >
      <p className="mt-2 text-sm text-slate-500">
        Exercícios personalizados ficam visíveis só para você e seus alunos.
      </p>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-semibold">
          Nome
          <input
            autoFocus
            className="field mt-2"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Parte do corpo"
            value={bodyPart}
            onChange={setBodyPart}
            options={bodyPartLabels}
          />
          <SelectField
            label="Equipamento"
            value={equipment}
            onChange={setEquipment}
            options={equipmentLabels}
          />
          <SelectField
            label="Músculo principal"
            value={muscle}
            onChange={setMuscle}
            options={muscleLabels}
          />
        </div>
        {(formError || create.error) && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {formError || 'Não foi possível criar o exercício.'}
          </p>
        )}
        <Button className="w-full" disabled={create.isPending} type="submit">
          {create.isPending && <LoaderCircle className="animate-spin" size={17} />}
          Criar exercício
        </Button>
      </form>
    </Dialog>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Record<string, string>
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select
        className="field mt-2"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {Object.entries(options)
          .sort((left, right) => left[1].localeCompare(right[1], 'pt-BR'))
          .map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
      </select>
    </label>
  )
}
