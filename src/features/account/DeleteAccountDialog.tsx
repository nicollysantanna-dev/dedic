import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import {
  useDeleteAccount,
  useDeletionImpact,
} from '@/features/account/delete-account-queries'
import { useAuth } from '@/features/auth/auth-context'

const CONFIRMATION_WORD = 'EXCLUIR'

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!open) return null
  return <DeleteAccountDialogContent onClose={() => onOpenChange(false)} />
}

function DeleteAccountDialogContent({ onClose }: { onClose: () => void }) {
  const { profile, session, signOut } = useAuth()
  const navigate = useNavigate()
  const impact = useDeletionImpact(profile)
  const deleteAccount = useDeleteAccount()
  const isTrainer = profile?.role === 'trainer'
  const impactBlocking = isTrainer && !impact.data
  const [confirmation, setConfirmation] = useState('')
  const canDelete =
    confirmation === CONFIRMATION_WORD &&
    !deleteAccount.isPending &&
    Boolean(session) &&
    !impactBlocking

  async function handleDelete() {
    if (!session) return
    try {
      await deleteAccount.mutateAsync(session.access_token)
    } catch {
      return
    }
    // O servidor já revogou as sessões; falha no signOut local é irrelevante.
    await signOut().catch(() => undefined)
    void navigate('/?conta=excluida', { replace: true })
  }

  const futureLessons = impact.data?.futureLessons ?? 0
  const activeStudents = impact.data?.activeStudents ?? 0

  return (
    <Dialog
      eyebrow="Sua conta"
      onClose={onClose}
      pending={deleteAccount.isPending}
      title="Excluir conta"
    >
      <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
        <p>Esta ação é permanente e não pode ser desfeita.</p>
        <div>
          <h3 className="font-semibold text-slate-950">O que será apagado</h3>
          <p>
            Seu perfil, foto, telefone, medidas, fotos de evolução, metas e a conexão com
            o Hevy.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-950">
            O que será mantido sem identificação
          </h3>
          <p>
            Aulas, créditos, pagamentos e treinos já registrados, para o histórico da
            outra parte.
          </p>
        </div>
        {isTrainer && impact.isError && (
          <div className="space-y-2 rounded-xl bg-red-50 p-3 text-red-700">
            <p role="alert">Não foi possível calcular o impacto da exclusão.</p>
            <Button onClick={() => void impact.refetch()} type="button" variant="outline">
              Tentar novamente
            </Button>
          </div>
        )}
        {isTrainer && !impact.data && !impact.isError && (
          <p className="rounded-xl bg-slate-50 p-3" role="status">
            Calculando o impacto…
          </p>
        )}
        {isTrainer && impact.data && (
          <ul className="list-disc rounded-xl bg-amber-50 py-3 pl-8 pr-3 text-amber-900">
            <li>
              {plural(
                futureLessons,
                'aula futura será cancelada',
                'aulas futuras serão canceladas',
              )}
            </li>
            <li>
              {plural(
                activeStudents,
                'aluno será desvinculado',
                'alunos serão desvinculados',
              )}
            </li>
          </ul>
        )}
        <label className="block font-semibold text-slate-950">
          Digite EXCLUIR para confirmar
          <input
            autoComplete="off"
            className="field mt-2"
            disabled={deleteAccount.isPending}
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </label>
        {deleteAccount.isError && (
          <p className="rounded-xl bg-red-50 p-3 text-red-700" role="alert">
            Não foi possível excluir sua conta.
          </p>
        )}
        <Button
          className="w-full bg-red-600 text-white hover:bg-red-700"
          disabled={!canDelete}
          onClick={() => void handleDelete()}
          type="button"
        >
          {deleteAccount.isPending && <LoaderCircle className="animate-spin" size={17} />}
          {deleteAccount.isError ? 'Tentar novamente' : 'Excluir conta'}
        </Button>
      </div>
    </Dialog>
  )
}
