import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Dumbbell,
  History,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { isSupabaseConfigured } from '@/lib/env'

const week = [
  { day: 'SEG', date: '24' },
  { day: 'TER', date: '25', active: true },
  { day: 'QUA', date: '26' },
  { day: 'QUI', date: '27' },
  { day: 'SEX', date: '28' },
]

const shortcuts = [
  { label: 'Calendário', icon: CalendarDays },
  { label: 'Meu pacote', icon: CreditCard },
  { label: 'Histórico', icon: History },
]

export function FoundationPage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#f4f1e9] text-[#183529]">
      <div className="pointer-events-none fixed -right-24 -top-24 h-80 w-80 rounded-full bg-[#d8b463]/20 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#6da47e]/15 blur-3xl" />

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 pb-28 pt-6 sm:px-8 lg:px-12 lg:pb-12">
        <header className="flex items-center justify-between">
          <a className="flex items-center gap-3" href="/" aria-label="Dedic — início">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#173d2c] text-white shadow-lg shadow-[#173d2c]/15">
              <Dumbbell aria-hidden="true" size={20} />
            </span>
            <span className="font-display text-2xl font-bold tracking-[-0.04em]">
              dedic.
            </span>
          </a>

          <button
            type="button"
            className="grid size-11 place-items-center rounded-full border border-[#173d2c]/10 bg-white/65 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a850]"
            aria-label="Abrir mais opções"
          >
            <MoreHorizontal aria-hidden="true" size={20} />
          </button>
        </header>

        <section className="mt-10 grid flex-1 items-start gap-8 lg:mt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#173d2c]/10 bg-white/55 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#38634e]">
              <Sparkles size={14} aria-hidden="true" />
              Seu ritmo, organizado
            </div>

            <h1 className="font-display mt-5 max-w-xl text-[clamp(2.65rem,8vw,5.7rem)] font-bold leading-[0.94] tracking-[-0.065em]">
              Bom dia,
              <br />
              <span className="text-[#a47b2e]">Nicolly.</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-[#4d6459] sm:text-lg">
              Sua agenda e seus créditos em um só lugar. Sem contas no fim do mês, sem
              perder o ritmo.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link to="/cadastro">
                  Começar agora
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </Button>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[#567064]">
                <span className="grid size-5 place-items-center rounded-full bg-[#dcebdc] text-[#24583c]">
                  <Check size={13} strokeWidth={3} aria-hidden="true" />
                </span>
                Agenda sincronizada
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rotate-2 rounded-[2.25rem] border border-[#173d2c]/8 bg-[#e7dfcd]/60" />
            <article className="relative overflow-hidden rounded-[2rem] bg-[#173d2c] p-6 text-white shadow-[0_28px_70px_rgba(24,53,41,0.2)] sm:p-8">
              <div className="absolute -right-10 -top-10 size-40 rounded-full border border-white/10" />
              <div className="absolute -right-3 top-8 size-24 rounded-full border border-white/10" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b7cdbf]">
                    Próxima aula
                  </p>
                  <h2 className="font-display mt-2 text-3xl font-bold tracking-[-0.04em]">
                    Terça, 25 ago
                  </h2>
                </div>
                <span className="rounded-full bg-[#d6a850] px-3 py-1.5 text-xs font-bold text-[#173326]">
                  Confirmada
                </span>
              </div>

              <div className="relative mt-7 flex items-center gap-3 border-y border-white/10 py-5">
                <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-[#f2cd7c]">
                  <Clock3 size={23} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xl font-semibold">18:30 — 19:30</p>
                  <p className="mt-0.5 text-sm text-[#b7cdbf]">com Rafael Martins</p>
                </div>
              </div>

              <div className="relative mt-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-[#b7cdbf]">Aulas disponíveis</p>
                  <p className="font-display mt-1 text-4xl font-bold tracking-[-0.04em]">
                    7 <span className="text-base font-medium text-[#8eaa98]">de 12</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a850]"
                >
                  Ver detalhes
                </button>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.82fr]">
          <div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#718278]">
                  Esta semana
                </p>
                <h2 className="font-display mt-1 text-2xl font-bold tracking-[-0.04em]">
                  Agosto
                </h2>
              </div>
              <button className="text-sm font-semibold text-[#38634e]" type="button">
                Abrir calendário
              </button>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2 rounded-[1.5rem] border border-[#173d2c]/8 bg-white/45 p-2 sm:gap-3 sm:p-3">
              {week.map(({ day, date, active }) => (
                <button
                  type="button"
                  key={date}
                  aria-current={active ? 'date' : undefined}
                  className={`rounded-2xl px-1 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a850] sm:py-4 ${
                    active
                      ? 'bg-[#d6a850] text-[#173326] shadow-md shadow-[#a47b2e]/15'
                      : 'hover:bg-white/80'
                  }`}
                >
                  <span className="block text-[0.65rem] font-bold tracking-[0.12em] opacity-65">
                    {day}
                  </span>
                  <span className="font-display mt-1 block text-xl font-bold">
                    {date}
                  </span>
                  <span
                    className={`mx-auto mt-2 block size-1 rounded-full ${active ? 'bg-[#173326]' : 'bg-transparent'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 self-end">
            {shortcuts.map(({ label, icon: Icon }) => (
              <button
                type="button"
                key={label}
                className="group flex min-h-28 flex-col items-start justify-between rounded-[1.4rem] border border-[#173d2c]/8 bg-white/50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a850]"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-[#e3ebe3] text-[#2c5a42] transition group-hover:bg-[#d6a850]/25">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="text-xs font-bold leading-tight sm:text-sm">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <footer className="mt-10 flex flex-col gap-2 border-t border-[#173d2c]/8 pt-5 text-xs text-[#718278] sm:flex-row sm:items-center sm:justify-between">
          <p>Preview de fundação — dados demonstrativos.</p>
          <p>
            {isSupabaseConfigured
              ? 'Ambiente de dados conectado'
              : 'Conexão de dados pendente'}
          </p>
        </footer>
      </div>

      <nav
        className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-sm items-center justify-around rounded-2xl border border-white/50 bg-[#173d2c]/95 px-2 py-2 text-white shadow-2xl backdrop-blur lg:hidden"
        aria-label="Navegação principal"
      >
        {shortcuts.map(({ label, icon: Icon }, index) => (
          <button
            type="button"
            key={label}
            className={`flex min-w-20 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[0.65rem] font-semibold ${
              index === 0 ? 'bg-white/10 text-[#f0c96f]' : 'text-[#c1d0c7]'
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </main>
  )
}
