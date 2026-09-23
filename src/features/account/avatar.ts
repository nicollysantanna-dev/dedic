import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { prepareImage } from '@/lib/image'
import { requireSupabase } from '@/lib/supabase/client'

export const avatarBucket = 'avatar-photos'
const signedUrlSeconds = 300

export const avatarKeys = {
  url: (path: string) => ['avatar-url', path] as const,
}

/** URL assinada de curta duração; a política do bucket já restringe quem pode gerar. */
export function useAvatarUrl(path: string | null) {
  return useQuery({
    queryKey: avatarKeys.url(path ?? ''),
    enabled: Boolean(path),
    staleTime: (signedUrlSeconds - 30) * 1000,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .storage.from(avatarBucket)
        .createSignedUrl(path!, signedUrlSeconds)
      if (error) throw error
      return data.signedUrl
    },
  })
}

export function useUploadAvatar(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { file: File; previousPath: string | null }) => {
      const prepared = await prepareImage(input.file)
      const path = `${userId}/${crypto.randomUUID()}.jpg`
      const storage = requireSupabase().storage.from(avatarBucket)
      const upload = await storage.upload(path, prepared, {
        contentType: 'image/jpeg',
        upsert: false,
      })
      if (upload.error) throw upload.error

      const { data, error } = await requireSupabase().rpc('update_own_avatar', {
        requested_avatar_path: path,
      })
      if (error) {
        // Sem o vínculo no perfil a foto ficaria órfã: desfaz o upload.
        await storage.remove([path])
        throw error
      }

      if (input.previousPath) await storage.remove([input.previousPath])
      return data
    },
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({
        queryKey: avatarKeys.url(input.previousPath ?? ''),
      })
    },
  })
}

export function useRemoveAvatar() {
  return useMutation({
    mutationFn: async (currentPath: string) => {
      const { error } = await requireSupabase().rpc('update_own_avatar', {})
      if (error) throw error
      await requireSupabase().storage.from(avatarBucket).remove([currentPath])
    },
  })
}
