import { requireSupabase } from '@/lib/supabase/client'

/**
 * Mídia de um exercício: imagens do catálogo (bucket exercise-media, domínio
 * público) e foto do aparelho tirada por quem usa o app (bucket exercise-photos).
 */
export type ExerciseMedia = {
  images: string[]
  photoPath: string | null
  instructions: string[]
}

export const exerciseMediaBucket = 'exercise-media'
export const exercisePhotosBucket = 'exercise-photos'

export const emptyMedia: ExerciseMedia = { images: [], photoPath: null, instructions: [] }

function publicUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null
  return requireSupabase().storage.from(bucket).getPublicUrl(path).data.publicUrl
}

/** URL pública (CDN) de uma imagem do catálogo. */
export const exerciseImageUrl = (path: string | null | undefined) =>
  publicUrl(exerciseMediaBucket, path)

/** URL pública (CDN) da foto do aparelho. */
export const exercisePhotoUrl = (path: string | null | undefined) =>
  publicUrl(exercisePhotosBucket, path)

/** Miniatura: foto do aparelho tem prioridade sobre a primeira imagem do catálogo. */
export function exerciseThumbUrl(media: ExerciseMedia) {
  return exercisePhotoUrl(media.photoPath) ?? exerciseImageUrl(media.images[0]) ?? null
}

/**
 * Monta a mídia a partir de uma linha de `exercises` com os apelidos do personal
 * (fichas e sessões) — a foto do próprio exercício vale para todos; a do apelido,
 * só a do personal da ficha/sessão.
 */
export function exerciseMediaFrom(
  exercise: {
    image_paths: string[]
    instructions: string[]
    photo_path: string | null
    aliases?: { trainer_id: string; photo_path: string | null }[]
  },
  trainerId: string | null,
): ExerciseMedia {
  const aliasPhoto = trainerId
    ? exercise.aliases?.find((item) => item.trainer_id === trainerId)?.photo_path
    : undefined
  return {
    images: exercise.image_paths,
    instructions: exercise.instructions,
    photoPath: exercise.photo_path ?? aliasPhoto ?? null,
  }
}
