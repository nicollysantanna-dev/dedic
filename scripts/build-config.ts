import { readFileSync } from 'node:fs'

type VercelConfig = {
  headers?: { source: string; headers: { key: string; value: string }[] }[]
}

/** Headers globais do vercel.json — fonte única para produção e para o `vite preview`. */
export function readVercelHeaders(path: string): Record<string, string> {
  const config = JSON.parse(readFileSync(path, 'utf8')) as VercelConfig
  const global = config.headers?.find((rule) => rule.source === '/(.*)')
  return Object.fromEntries((global?.headers ?? []).map(({ key, value }) => [key, value]))
}

/**
 * Libera uma origem extra do Supabase (ex.: o local em http://127.0.0.1:54321) nas
 * diretivas que o navegador usa para falar com ele. A CSP de produção só conhece
 * `*.supabase.co`; o preview do E2E precisa também do Supabase local.
 */
export function allowSupabaseOrigin(csp: string, supabaseUrl: string): string {
  const origin = new URL(supabaseUrl).origin
  const socket = origin.replace(/^http/, 'ws')
  const extra: Record<string, string[]> = {
    'connect-src': [origin, socket],
    'img-src': [origin],
  }
  return csp
    .split(';')
    .map((directive) => {
      const name = directive.trim().split(/\s+/)[0]
      const origins = extra[name]
      if (!origins) return directive.trim()
      const present = directive.trim().split(/\s+/)
      const missing = origins.filter((value) => !present.includes(value))
      return [directive.trim(), ...missing].join(' ')
    })
    .join('; ')
}

const requiredPublicEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'] as const

/**
 * Em deploys na Vercel o build falha sem as variáveis públicas do Supabase, em vez de
 * publicar um app que só mostra a tela de configuração. Fora da Vercel (dev, CI,
 * testes) a ausência continua permitida.
 */
export function assertDeployEnv(
  env: Record<string, string | undefined>,
  isVercel: boolean,
) {
  if (!isVercel) return
  const missing = requiredPublicEnv.filter((key) => !env[key]?.trim())
  if (missing.length > 0) {
    throw new Error(`Variáveis obrigatórias ausentes no deploy: ${missing.join(', ')}`)
  }
}
