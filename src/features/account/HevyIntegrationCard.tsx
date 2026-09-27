import { CheckCircle2, CircleAlert, Dumbbell, LoaderCircle, Unplug } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  useConnectHevy,
  useDisconnectHevy,
  useHevyConnection,
  useSyncHevy,
} from '@/features/account/hevy-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDateTime } from '@/lib/format'

/**
 * Card de Conta → Integrações: conectar/sincronizar/desconectar a conta do
 * Hevy. Só o próprio aluno vê e gerencia; o personal enxerga o resultado nos
 * componentes de histórico e recordes que já existem, sem UI própria.
 */
export function HevyIntegrationCard({ userId }: { userId: string }) {
  const { session } = useAuth()
  const connection = useHevyConnection(userId)
  const connect = useConnectHevy(userId)
  const disconnect = useDisconnectHevy(userId)
  const sync = useSyncHevy(userId)
  const [apiKey, setApiKey] = useState('')
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false)

  if (connection.isLoading) {
    return (
      <div className="rounded-[1.5rem] bg-white p-6 text-slate-950">
        <Dumbbell className="text-[var(--brand)]" />
        <h2 className="mt-4 font-bold">Hevy</h2>
        <p className="mt-2 text-sm text-slate-500">Carregando integração…</p>
      </div>
    )
  }

  if (connection.error) {
    return (
      <div className="rounded-[1.5rem] bg-white p-6 text-slate-950">
        <Dumbbell className="text-[var(--brand)]" />
        <h2 className="mt-4 font-bold">Hevy</h2>
        <p className="mt-2 text-sm text-red-700" role="alert">
          Não foi possível carregar o status da integração com o Hevy.
        </p>
      </div>
    )
  }

  const connectedSince = connection.data?.connected_at ?? null

  return (
    <div className="rounded-[1.5rem] bg-white p-6 text-slate-950">
      <Dumbbell className="text-[var(--brand)]" />
      <h2 className="mt-4 font-bold">Hevy</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Traga para o Dedic o histórico de treinos que você já registrou no Hevy.
      </p>

      {!connectedSince && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            connect.mutate(apiKey, { onSuccess: () => setApiKey('') })
          }}
        >
          <label className="block text-sm font-semibold" htmlFor="hevy-api-key">
            Chave de API do Hevy Pro
            <input
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              disabled={connect.isPending}
              id="hevy-api-key"
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Cole aqui a chave gerada no app do Hevy"
              type="password"
              value={apiKey}
            />
          </label>
          {connect.error && (
            <p className="text-sm text-red-700" role="alert">
              Não foi possível conectar. Confira a chave e tente novamente.
            </p>
          )}
          <Button disabled={connect.isPending || !apiKey.trim()} type="submit">
            {connect.isPending && <LoaderCircle className="animate-spin" size={17} />}
            Conectar
          </Button>
        </form>
      )}

      {connectedSince && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-500">
            <span>Conectado desde {formatDateTime(connectedSince)}.</span>
            <br />
            <span>
              {connection.data?.last_synced_at
                ? `Última sincronização em ${formatDateTime(connection.data.last_synced_at)}.`
                : 'Ainda não sincronizado.'}
            </span>
          </p>

          {connection.data?.last_sync_status === 'error' &&
            connection.data.last_sync_error && (
              <p className="flex items-center gap-2 text-sm text-red-700" role="alert">
                <CircleAlert className="shrink-0" size={16} />
                {connection.data.last_sync_error}
              </p>
            )}

          {sync.isSuccess && (
            <p className="flex items-center gap-2 text-sm text-emerald-700" role="status">
              <CheckCircle2 className="shrink-0" size={16} />
              {sync.data.imported} treino{sync.data.imported === 1 ? '' : 's'} importado
              {sync.data.imported === 1 ? '' : 's'}
              {sync.data.skipped > 0 ? `, ${sync.data.skipped} com falha` : ''}.
            </p>
          )}
          {sync.isError && (
            <p className="text-sm text-red-700" role="alert">
              Não foi possível sincronizar. Tente novamente.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={sync.isPending || !session?.access_token}
              onClick={() => {
                if (session?.access_token) sync.mutate(session.access_token)
              }}
              variant="outline"
            >
              {sync.isPending && <LoaderCircle className="animate-spin" size={17} />}
              Sincronizar agora
            </Button>

            {isConfirmingDisconnect ? (
              <div className="flex items-center gap-2">
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={disconnect.isPending}
                  onClick={() =>
                    disconnect.mutate(undefined, {
                      onSuccess: () => setIsConfirmingDisconnect(false),
                    })
                  }
                >
                  {disconnect.isPending && (
                    <LoaderCircle className="animate-spin" size={17} />
                  )}
                  Confirmar
                </Button>
                <Button
                  disabled={disconnect.isPending}
                  onClick={() => setIsConfirmingDisconnect(false)}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button onClick={() => setIsConfirmingDisconnect(true)} variant="outline">
                <Unplug size={16} /> Desconectar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
