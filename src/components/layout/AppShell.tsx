import {
  CalendarDays,
  CircleDollarSign,
  Dumbbell,
  House,
  LogOut,
  TrendingUp,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '@/features/auth/auth-context'
import { NotificationsBell } from '@/features/notifications/NotificationsBell'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

const trainerNavigation = [
  { to: '/app', label: 'Início', icon: House, end: true },
  { to: '/app/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/app/alunos', label: 'Alunos', icon: UsersRound },
  { to: '/app/financeiro', label: 'Financeiro', icon: CircleDollarSign },
  { to: '/app/conta', label: 'Conta', icon: UserRound },
]

const studentNavigation = [
  { to: '/app', label: 'Início', icon: House, end: true },
  { to: '/app/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/app/treinos', label: 'Treinos', icon: Dumbbell },
  { to: '/app/evolucao', label: 'Evolução', icon: TrendingUp },
  { to: '/app/conta', label: 'Conta', icon: UserRound },
]

export function AppShell() {
  const { profile, signOut } = useAuth()
  const navigation = profile?.role === 'trainer' ? trainerNavigation : studentNavigation

  return (
    <div className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-white/7 bg-[var(--sidebar-bg)] px-4 py-7 lg:flex">
        <div className="flex items-center justify-between px-2">
          <NavLink
            className="text-2xl font-extrabold tracking-[-0.05em] text-white"
            to="/app"
          >
            dedic.
          </NavLink>
          <NotificationsBell />
        </div>

        <nav className="mt-10 space-y-2" aria-label="Navegação principal">
          {navigation.map((item) => (
            <ShellLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="mt-auto border-t border-white/8 pt-5">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-500/18 text-sm font-bold text-blue-300">
              {initials(profile?.full_name ?? 'Usuário')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {profile?.full_name ?? 'Carregando…'}
              </p>
              <p className="text-xs text-slate-400">
                {profile?.role === 'trainer' ? 'Personal trainer' : 'Aluno'}
              </p>
            </div>
            <button
              className="grid size-9 place-items-center rounded-xl text-slate-400 transition hover:bg-white/8 hover:text-white"
              type="button"
              onClick={() => void signOut()}
              aria-label="Sair da conta"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-dvh lg:pl-56">
        <div className="flex items-center justify-between px-4 pt-3 lg:hidden">
          <NavLink
            className="text-xl font-extrabold tracking-[-0.05em] text-white"
            to="/app"
          >
            dedic.
          </NavLink>
          <NotificationsBell />
        </div>
        <Outlet />
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/8 bg-[var(--sidebar-bg)] px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
        aria-label="Navegação principal"
      >
        {navigation.map((item) => (
          <MobileShellLink key={item.to} {...item} />
        ))}
      </nav>
    </div>
  )
}

function ShellLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          'relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-3 text-sm font-medium text-slate-400 transition hover:bg-white/6 hover:text-white',
          isActive && 'text-white',
        )
      }
      end={end}
      to={to}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              className="absolute inset-0 bg-[var(--brand)]"
              layoutId="desktop-active-navigation"
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            />
          )}
          <Icon className="relative" size={18} />
          <span className="relative">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function MobileShellLink(props: {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}) {
  const { icon: Icon, label, ...linkProps } = props
  return (
    <NavLink
      {...linkProps}
      className={({ isActive }) =>
        cn(
          'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[0.65rem] font-medium text-slate-500 transition',
          isActive && 'text-blue-400',
        )
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  )
}
