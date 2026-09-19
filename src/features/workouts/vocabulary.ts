/** Vocabulário PT-BR fixo para a classificação do ExerciseDB (partes do corpo, equipamentos, músculos). */

export const bodyPartLabels: Record<string, string> = {
  back: 'Costas',
  cardio: 'Cardio',
  chest: 'Peito',
  'lower arms': 'Antebraços',
  'lower legs': 'Panturrilhas',
  neck: 'Pescoço',
  shoulders: 'Ombros',
  'upper arms': 'Braços',
  'upper legs': 'Pernas',
  waist: 'Abdômen',
}

export const equipmentLabels: Record<string, string> = {
  assisted: 'Assistido',
  band: 'Elástico',
  barbell: 'Barra',
  'body weight': 'Peso do corpo',
  'bosu ball': 'Bosu',
  cable: 'Cabo / polia',
  dumbbell: 'Halter',
  'elliptical machine': 'Elíptico',
  'ez barbell': 'Barra W',
  hammer: 'Máquina hammer',
  kettlebell: 'Kettlebell',
  'leverage machine': 'Máquina articulada',
  'medicine ball': 'Bola medicinal',
  'olympic barbell': 'Barra olímpica',
  'resistance band': 'Elástico',
  roller: 'Rolo',
  rope: 'Corda',
  'skierg machine': 'SkiErg',
  'sled machine': 'Trenó',
  'smith machine': 'Smith',
  'stability ball': 'Bola suíça',
  'stationary bike': 'Bicicleta',
  'stepmill machine': 'Escada',
  tire: 'Pneu',
  'trap bar': 'Barra hexagonal',
  'upper body ergometer': 'Ergômetro de braço',
  weighted: 'Com peso adicional',
  'wheel roller': 'Roda abdominal',
}

export const muscleLabels: Record<string, string> = {
  abductors: 'Abdutores',
  abs: 'Abdômen',
  adductors: 'Adutores',
  biceps: 'Bíceps',
  calves: 'Panturrilhas',
  'cardiovascular system': 'Sistema cardiovascular',
  delts: 'Deltoides',
  forearms: 'Antebraços',
  glutes: 'Glúteos',
  hamstrings: 'Posteriores de coxa',
  lats: 'Dorsais',
  'levator scapulae': 'Levantador da escápula',
  pectorals: 'Peitorais',
  quads: 'Quadríceps',
  'serratus anterior': 'Serrátil anterior',
  spine: 'Coluna',
  traps: 'Trapézio',
  triceps: 'Tríceps',
  'upper back': 'Costas superiores',
  shoulders: 'Ombros',
  chest: 'Peito',
  core: 'Core',
  'lower back': 'Lombar',
  'rotator cuff': 'Manguito rotador',
  obliques: 'Oblíquos',
  'hip flexors': 'Flexores do quadril',
  'rear deltoids': 'Deltoides posteriores',
  'front deltoids': 'Deltoides anteriores',
  'wrist flexors': 'Flexores do punho',
  'wrist extensors': 'Extensores do punho',
  ankles: 'Tornozelos',
  feet: 'Pés',
  'inner thighs': 'Parte interna da coxa',
  'outer thighs': 'Parte externa da coxa',
  'shoulder stabilizers': 'Estabilizadores do ombro',
  soleus: 'Sóleo',
  'erector spinae': 'Eretores da espinha',
  sternocleidomastoid: 'Esternocleidomastóideo',
  rhomboids: 'Romboides',
  brachialis: 'Braquial',
  'ankle stabilizers': 'Estabilizadores do tornozelo',
  'hip abductors': 'Abdutores do quadril',
  'hip adductors': 'Adutores do quadril',
  'grip muscles': 'Músculos da pegada',
  'rear delts': 'Deltoides posteriores',
  'front delts': 'Deltoides anteriores',
  'middle delts': 'Deltoides médios',
  'lower abs': 'Abdômen inferior',
  'upper abs': 'Abdômen superior',
}

/** Rótulo em PT-BR; se não houver tradução, devolve o termo original capitalizado. */
export function labelFor(kind: 'bodyPart' | 'equipment' | 'muscle', value: string) {
  const table =
    kind === 'bodyPart'
      ? bodyPartLabels
      : kind === 'equipment'
        ? equipmentLabels
        : muscleLabels
  return table[value] ?? value.charAt(0).toUpperCase() + value.slice(1)
}
