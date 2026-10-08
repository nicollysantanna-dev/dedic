import { requireSupabase } from '@/lib/supabase/client'

/**
 * Mídia de um exercício: miniatura e GIF animado do pacote (bucket
 * exercise-media) e foto do aparelho tirada por quem usa o app (bucket
 * exercise-photos).
 */
export type ExerciseMedia = {
  images: string[]
  animationPath: string | null
  photoPath: string | null
  instructions: string[]
}

export const exerciseMediaBucket = 'exercise-media'
export const exercisePhotosBucket = 'exercise-photos'

export const emptyMedia: ExerciseMedia = {
  images: [],
  animationPath: null,
  photoPath: null,
  instructions: [],
}

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

/** O catálogo só demonstra com GIF animado 3D; nenhuma foto de pessoa (ADR 0012). */
const animatedCatalogFolder = 'gif-pack/'

/** Imagens do catálogo que podem aparecer: só as do pacote de GIFs. */
export const catalogImages = (paths: string[]) =>
  paths.filter((path) => path.startsWith(animatedCatalogFolder))

/** Há algo para demonstrar o movimento: o GIF animado. */
export const hasExerciseDemonstration = (media: Pick<ExerciseMedia, 'animationPath'>) =>
  Boolean(media.animationPath)

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
    animation_path: string | null
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
    images: catalogImages(exercise.image_paths),
    animationPath: exercise.animation_path,
    instructions: exercise.instructions,
    photoPath: exercise.photo_path ?? aliasPhoto ?? null,
  }
}
