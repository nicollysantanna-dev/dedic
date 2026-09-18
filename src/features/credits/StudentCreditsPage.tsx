import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  PackageCheck,
  Receipt,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import {
  transactionTypeLabels,
  useCreditBalance,
  useCreditLedger,
  useStudentPackages,
} from '@/features/credits/queries'
import { paymentKeys } from '@/features/payments/keys'
import { requireSupabase } from '@/lib/supabase/client'
import { formatCurrency, formatDateOnly, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const packageStatusLabels = {
  draft: 'Aguardando ativação',
  active: 'Ativo',
  exhausted: 'Esgotado',
  expired: 'Encerrado',
  cancelled: 'Cancelado',
}

const paymentStatusLabels = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
}

export function StudentCreditsPage() {
  const { profile } = useAuth()
  const studentId = profile?.id ?? ''
  const balance = useCreditBalance(studentId)
  const ledger = useCreditLedger(studentId)
  const packages = useStudentPackages(studentId)
  const nextPayment = useQuery({
    queryKey: paymentKeys.next(studentId),
    enabled: Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('payments')
        .select('amount_cents, due_on, status')
        .eq('student_id', studentId)
        .in('status', ['pending', 'overdue'])
        .order('due_on')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const loading = balance.isLoading || ledger.isLoading || packages.isLoading
  const error = balance.error || ledger.error || packages.error
  const activePackages = (packages.data ?? []).filter((item) => item.status === 'active')

  return (
    <main className="min-h-dvh px-4 pb-28 pt-5 text-white sm:px-7 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-sm text-slate-400">Seu saldo e histórico</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            Créditos
          </h1>
        </header>

        {loading && (
          <p className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-8 text-center text-sm text-slate-300">
            Carregando créditos…
          </p>
        )}
        {error && (
          <p
            className="mt-6 rounded-2xl bg-red-400/10 p-4 text-sm text-red-100"
            role="alert"
          >
            Não foi possível carregar seus créditos.
          </p>
        )}

        {!loading && !error && (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              <article className="rounded-[1.25rem] bg-white p-5 text-slate-950">
                <CreditCard className="text-blue-600" size={19} />
                <p className="mt-4 text-xs text-slate-500">Créditos disponíveis</p>
                <p className="mt-1 text-3xl font-bold">{balance.data ?? 0}</p>
                <p className="mt-1 text-[0.7rem] text-slate-400">Sem vencimento</p>
              </article>
              <article className="rounded-[1.25rem] bg-white p-5 text-slate-950">
                <PackageCheck className="text-blue-600" size={19} />
                <p className="mt-4 text-xs text-slate-500">Pacotes ativos</p>
                <p className="mt-1 text-3xl font-bold">{activePackages.length}</p>
                <p className="mt-1 text-[0.7rem] text-slate-400">
                  {activePackages.length
                    ? `Renovação prevista em ${formatDateOnly(activePackages[0].expires_on)}`
                    : 'Fale com seu personal para ativar um pacote'}
                </p>
              </article>
              <article className="rounded-[1.25rem] bg-white p-5 text-slate-950">
                <Receipt className="text-blue-600" size={19} />
                <p className="mt-4 text-xs text-slate-500">Pagamento</p>
                <p className="mt-1 text-xl font-bold">
                  {nextPayment.data
                    ? paymentStatusLabels[nextPayment.data.status]
                    : 'Em dia'}
                </p>
                <p className="mt-1 text-[0.7rem] text-slate-400">
                  {nextPayment.data
                    ? `${formatCurrency(nextPayment.data.amount_cents)} · vence ${formatDateOnly(nextPayment.data.due_on)}`
                    : 'Nenhuma cobrança pendente'}
                </p>
                <Button asChild className="mt-3 h-9 px-3 text-xs" variant="outline">
                  <Link to="/app/financeiro">Ver pagamentos</Link>
                </Button>
              </article>
            </section>

            {activePackages.length === 0 && (
              <section className="mt-6 rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center">
                <PackageCheck className="mx-auto text-blue-400" size={30} />
                <h2 className="mt-4 text-lg font-bold">Nenhum pacote ativo.</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                  Quando seu personal ativar um pacote, os créditos aparecem aqui e você
                  pode agendar aulas pela Agenda.
                </p>
              </section>
            )}

            {packages.data && packages.data.length > 0 && (
              <section className="mt-6 rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
                <h2 className="text-lg font-bold">Pacotes</h2>
                <ul className="mt-4 divide-y divide-slate-100">
                  {packages.data.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div>
                        <p className="font-semibold">{item.lesson_count} aulas</p>
                        <p className="text-xs text-slate-500">
                          {formatDateOnly(item.starts_on)} a{' '}
                          {formatDateOnly(item.expires_on)} ·{' '}
                          {formatCurrency(item.price_cents)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-semibold',
                          item.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {packageStatusLabels[item.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-6 rounded-[1.5rem] bg-white p-5 text-slate-950 sm:p-6">
              <h2 className="text-lg font-bold">Extrato</h2>
              <p className="mt-1 text-sm text-slate-500">
                Toda variação do saldo aparece aqui, com origem e responsável.
              </p>
              <ul className="mt-4 divide-y divide-slate-100">
                {(ledger.data ?? []).map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 py-3">
                    <span
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-full',
                        entry.amount > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700',
                      )}
                    >
                      {entry.amount > 0 ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <ArrowDownLeft size={16} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {transactionTypeLabels[entry.transaction_type]}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDateTime(entry.created_at)}
                        {entry.author?.full_name ? ` · ${entry.author.full_name}` : ''}
                        {entry.reason ? ` · ${entry.reason}` : ''}
                      </p>
                    </div>
                    <strong
                      className={entry.amount > 0 ? 'text-emerald-700' : 'text-red-700'}
                    >
                      {entry.amount > 0 ? '+' : ''}
                      {entry.amount}
                    </strong>
                  </li>
                ))}
                {!ledger.data?.length && (
                  <li className="py-6 text-center text-sm text-slate-500">
                    Nenhuma movimentação ainda.
                  </li>
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
