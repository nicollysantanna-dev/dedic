import { Camera, LoaderCircle, Trash2, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'

import { useAvatarUrl, useRemoveAvatar, useUploadAvatar } from '@/features/account/avatar'
import { cn } from '@/lib/utils'

/** Foto de perfil com upload e remoção; usada por personal e aluno. */
export function AvatarPicker({
  userId,
  avatarPath,
  onChanged,
  size = 'lg',
}: {
  userId: string
  avatarPath: string | null
  onChanged: () => void | Promise<void>
  size?: 'lg' | 'md'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const signedUrl = useAvatarUrl(avatarPath)
  const upload = useUploadAvatar(userId)
  const remove = useRemoveAvatar()
  const isBusy = upload.isPending || remove.isPending

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    try {
      await upload.mutateAsync({ file, previousPath: avatarPath })
      await onChanged()
    } catch {
      setError('Não foi possível enviar a foto. Tente novamente.')
    }
  }

  const onRemove = async () => {
    if (!avatarPath) return
    setError('')
    try {
      await remove.mutateAsync(avatarPath)
      await onChanged()
    } catch {
      setError('Não foi possível remover a foto. Tente novamente.')
    }
  }

  const dimension = size === 'lg' ? 'size-20' : 'size-14'

  return (
    <div className="flex items-center gap-4">
      <span
        className={cn(
          'relative grid place-items-center overflow-hidden rounded-full bg-blue-100 text-blue-700',
          dimension,
        )}
      >
        {signedUrl.data ? (
          <img alt="" className="size-full object-cover" src={signedUrl.data} />
        ) : (
          <UserRound size={size === 'lg' ? 30 : 22} />
        )}
        {isBusy && (
          <span className="absolute inset-0 grid place-items-center bg-slate-950/40">
            <LoaderCircle className="animate-spin text-white" size={18} />
          </span>
        )}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          accept="image/*"
          className="sr-only"
          disabled={isBusy}
          onChange={(event) => void onFileChange(event)}
          ref={inputRef}
          type="file"
        />
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <Camera size={15} />
          {avatarPath ? 'Trocar foto' : 'Adicionar foto'}
        </button>
        {avatarPath && (
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            disabled={isBusy}
            onClick={() => void onRemove()}
            type="button"
          >
            <Trash2 size={15} />
            Remover
          </button>
        )}
      </div>
      {error && (
        <p className="w-full text-xs font-normal text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
