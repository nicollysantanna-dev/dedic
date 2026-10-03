// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { fileURLToPath, URL } from 'node:url'

import { allowSupabaseOrigin, assertDeployEnv, readVercelHeaders } from './build-config'

const vercelJson = fileURLToPath(new URL('../vercel.json', import.meta.url))

describe('readVercelHeaders', () => {
  it('lê os headers de segurança globais do vercel.json', () => {
    const headers = readVercelHeaders(vercelJson)

    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(headers['Content-Security-Policy']).toContain("script-src 'self';")
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Strict-Transport-Security']).toMatch(/max-age=\d+/)
  })
})

describe('allowSupabaseOrigin', () => {
  const csp = "default-src 'self'; img-src 'self' data:; connect-src 'self'"

  it('libera a origem em connect-src (http e ws) e img-src', () => {
    expect(allowSupabaseOrigin(csp, 'http://127.0.0.1:54321/')).toBe(
      "default-src 'self'; img-src 'self' data: http://127.0.0.1:54321; connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321",
    )
  })

  it('não duplica uma origem já presente', () => {
    const once = allowSupabaseOrigin(csp, 'http://127.0.0.1:54321')
    expect(allowSupabaseOrigin(once, 'http://127.0.0.1:54321')).toBe(once)
  })
})

describe('assertDeployEnv', () => {
  const complete = {
    VITE_SUPABASE_URL: 'https://projeto.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
  }

  it('aceita deploy com as variáveis públicas presentes', () => {
    expect(() => assertDeployEnv(complete, true)).not.toThrow()
  })

  it('falha no deploy da Vercel quando falta alguma variável', () => {
    expect(() =>
      assertDeployEnv({ ...complete, VITE_SUPABASE_PUBLISHABLE_KEY: ' ' }, true),
    ).toThrow('VITE_SUPABASE_PUBLISHABLE_KEY')
  })

  it('permite build sem variáveis fora da Vercel (dev, CI e testes)', () => {
    expect(() => assertDeployEnv({}, false)).not.toThrow()
  })
})
