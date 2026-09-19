import { Bell, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import {
  useMarkNotificationsRead,
  useNotifications,
} from '@/features/notifications/queries'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export function NotificationsPage() {
  const { profile } = useAuth()
  const userId = profile?.id ?? ''
  const notifications = useNotifications(userId)
  const markRead = useMarkNotificationsRead()
  const unread = (notifications.data ?? []).filter((item) => !item.read_at)

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Aulas, créditos, pagamentos e metas</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              Notificações
            </h1>
          </div>
          {unread.length > 0 && (
            <Button
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              disabled={markRead.isPending}
              onClick={() => markRead.mutate(undefined)}
              variant="outline"
            >
              <CheckCheck size={16} /> Marcar todas como lidas
            </Button>
          )}
        </header>

        {notifications.isLoading && (
          <p className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-8 text-center text-sm text-slate-300">
            Carregando…
          </p>
        )}
        {notifications.error && (
          <p
            className="mt-6 rounded-2xl bg-red-400/10 p-4 text-sm text-red-100"
            role="alert"
          >
            Não foi possível carregar as notificações.
          </p>
        )}
        {notifications.data && notifications.data.length === 0 && (
          <section className="mt-6 rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 px-6 py-14 text-center">
            <Bell className="mx-auto text-blue-400" size={30} />
            <h2 className="mt-4 text-lg font-bold">Nada por aqui ainda.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Você será avisado sobre aulas, créditos, pagamentos e metas.
            </p>
          </section>
        )}

        {notifications.data && notifications.data.length > 0 && (
          <ul className="mt-6 overflow-hidden rounded-[1.5rem] bg-white text-slate-950">
            {notifications.data.map((item) => {
              const content = (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      item.read_at ? 'bg-transparent' : 'bg-[var(--brand)]',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn('block text-sm', !item.read_at && 'font-semibold')}
                    >
                      {item.title}
                    </span>
                    {item.body && (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {item.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[0.7rem] text-slate-400">
                      {formatDateTime(item.created_at)}
                    </span>
                  </span>
                </>
              )
              const className = cn(
                'flex w-full gap-3 border-b border-slate-100 px-5 py-4 text-left transition last:border-b-0',
                !item.read_at && 'bg-blue-50/60',
                item.link && 'hover:bg-slate-50',
              )
              return (
                <li key={item.id}>
                  {item.link ? (
                    <Link
                      className={className}
                      onClick={() => {
                        if (!item.read_at) markRead.mutate([item.id])
                      }}
                      to={item.link}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      className={className}
                      onClick={() => {
                        if (!item.read_at) markRead.mutate([item.id])
                      }}
                      type="button"
                    >
                      {content}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
