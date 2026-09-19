import { Bell } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { useAuth } from '@/features/auth/auth-context'
import { useNotifications } from '@/features/notifications/queries'
import { cn } from '@/lib/utils'

export function NotificationsBell({ className }: { className?: string }) {
  const { profile } = useAuth()
  const notifications = useNotifications(profile?.id ?? '')
  const unread = (notifications.data ?? []).filter((item) => !item.read_at).length
  const label = unread ? `Notificações (${unread} não lidas)` : 'Notificações'

  return (
    <NavLink
      aria-label={label}
      className={({ isActive }) =>
        cn(
          'relative grid size-10 place-items-center rounded-xl text-slate-400 transition hover:bg-white/8 hover:text-white',
          isActive && 'bg-white/10 text-white',
          className,
        )
      }
      to="/app/notificacoes"
    >
      <Bell size={19} />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[0.65rem] font-bold text-white">
          {Math.min(unread, 99)}
        </span>
      )}
    </NavLink>
  )
}
