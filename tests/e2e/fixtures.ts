import { expect, test as base } from '@playwright/test'

/**
 * O preview serve a mesma CSP da Vercel (ver vite.config.ts). Toda jornada falha se o
 * navegador bloquear algum recurso, para que a política nunca quebre o app em produção.
 */
export const test = base.extend<{ cspViolations: string[] }>({
  cspViolations: [
    async ({ page }, use) => {
      const violations: string[] = []
      page.on('console', (message) => {
        if (
          message.type() === 'error' &&
          /Content Security Policy/i.test(message.text())
        ) {
          violations.push(message.text())
        }
      })
      await use(violations)
      expect(violations, 'violações de CSP durante o teste').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
