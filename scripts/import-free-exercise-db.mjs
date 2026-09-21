// Importa o catálogo do free-exercise-db (yuhonas/free-exercise-db, domínio
// público) para supabase/seed/exercises.json, já no vocabulário do app
// (partes do corpo, equipamentos e músculos usados em vocabulary.ts).
// Uso: node scripts/import-free-exercise-db.mjs
import { writeFileSync } from 'node:fs'

const source =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'

const equipmentMap = {
  'body only': 'body weight',
  machine: 'leverage machine',
  other: 'other',
  'foam roll': 'roller',
  kettlebells: 'kettlebell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  barbell: 'barbell',
  bands: 'band',
  'medicine ball': 'medicine ball',
  'exercise ball': 'stability ball',
  'e-z curl bar': 'ez barbell',
}

const muscleMap = {
  abdominals: 'abs',
  hamstrings: 'hamstrings',
  adductors: 'adductors',
  quadriceps: 'quads',
  biceps: 'biceps',
  shoulders: 'delts',
  chest: 'pectorals',
  'middle back': 'upper back',
  calves: 'calves',
  glutes: 'glutes',
  'lower back': 'lower back',
  lats: 'lats',
  triceps: 'triceps',
  traps: 'traps',
  forearms: 'forearms',
  neck: 'neck',
  abductors: 'abductors',
}

const bodyPartOf = {
  abdominals: 'waist',
  hamstrings: 'upper legs',
  adductors: 'upper legs',
  quadriceps: 'upper legs',
  abductors: 'upper legs',
  glutes: 'upper legs',
  calves: 'lower legs',
  biceps: 'upper arms',
  triceps: 'upper arms',
  forearms: 'lower arms',
  chest: 'chest',
  shoulders: 'shoulders',
  'middle back': 'back',
  'lower back': 'back',
  lats: 'back',
  traps: 'back',
  neck: 'neck',
}

const mapAll = (values, table) => {
  const mapped = []
  for (const value of values) {
    const target = table[value]
    if (!target) throw new Error(`Termo sem mapeamento: ${value}`)
    if (!mapped.includes(target)) mapped.push(target)
  }
  return mapped
}

const response = await fetch(source)
if (!response.ok) throw new Error(`free-exercise-db respondeu ${response.status}`)
const raw = await response.json()

const exercises = raw
  .map((exercise) => {
    const bodyParts = mapAll(exercise.primaryMuscles, bodyPartOf)
    if (exercise.category === 'cardio' && !bodyParts.includes('cardio'))
      bodyParts.push('cardio')
    return {
      externalId: exercise.id,
      name: exercise.name,
      category: exercise.category,
      level: exercise.level,
      bodyParts,
      equipments: exercise.equipment ? mapAll([exercise.equipment], equipmentMap) : [],
      targetMuscles: mapAll(exercise.primaryMuscles, muscleMap),
      secondaryMuscles: mapAll(exercise.secondaryMuscles, muscleMap),
      instructions: exercise.instructions.map((step) => step.trim()).filter(Boolean),
      images: exercise.images,
    }
  })
  .sort((a, b) => a.externalId.localeCompare(b.externalId))

writeFileSync('supabase/seed/exercises.json', JSON.stringify(exercises, null, 2) + '\n')
console.log(`${exercises.length} exercícios em supabase/seed/exercises.json`)
