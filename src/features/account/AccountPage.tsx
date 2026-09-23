import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useAvatarUrl } from '@/features/account/avatar'
import { EditProfileDialog } from '@/features/account/EditProfileDialog'
import { useAuth } from '@/features/auth/auth-context'
import { formatPhoneInput } from '@/features/students/invitation-contact'

export function AccountPage() {
  const { profile, session, signOut, refreshProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const avatarUrl = useAvatarUrl(profile?.avatar_path ?? null)

  return (
    <main className="min-h-dvh px-4 pb-28 pt-6 text-white sm:px-7 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-sm text-slate-400">Perfil e preferências</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em]">Sua conta</h1>
        </header>
        <section className="mt-6 rounded-[1.5rem] bg-white p-6 text-slate-950">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid size-20 place-items-center overflow-hidden rounded-full bg-blue-100 text-blue-700">
              {avatarUrl.data ? (
                <img alt="" className="size-full object-cover" src={avatarUrl.data} />
              ) : (
                <UserRound size={30} />
              )}
            </span>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{profile?.full_name}</h2>
              <p className="mt-1 text-sm text-slate-500">{session?.user.email}</p>
              <p className="mt-1 text-sm text-slate-500">
                {profile?.phone
                  ? formatPhoneInput(profile.phone.replace(/^\+55/, ''))
                  : 'Celular não informado'}
              </p>
              {profile?.role === 'trainer' && (
                <p className="mt-1 text-sm text-slate-500">
                  Aulas de {profile.default_lesson_duration_minutes} minutos
                </p>
              )}
            </div>
            <Button onClick={() => setIsEditing(true)} variant="outline">
              Editar perfil
            </Button>
          </div>
          {notice && (
            <p
              className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
              role="status"
            >
              {notice}
            </p>
          )}
        </section>
        {isEditing && profile && (
          <EditProfileDialog
            profile={profile}
            onClose={() => setIsEditing(false)}
            onSaved={async () => {
              await refreshProfile()
              setNotice('Perfil atualizado.')
            }}
          />
        )}
        <section className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="rounded-[1.5rem] bg-white p-6 text-slate-950">
            <ShieldCheck className="text-[var(--brand)]" />
            <h2 className="mt-4 font-bold">Segurança e acesso</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Configurações adicionais de senha e autenticação serão adicionadas em um
              próximo incremento.
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-6 text-slate-950">
            <LogOut className="text-red-500" />
            <h2 className="mt-4 font-bold">Encerrar sessão</h2>
            <p className="mt-2 text-sm text-slate-500">
              Saia com segurança deste dispositivo.
            </p>
            <Button className="mt-5" variant="outline" onClick={() => void signOut()}>
              <LogOut size={17} /> Sair da conta
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
