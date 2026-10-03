import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

import {
  allowSupabaseOrigin,
  assertDeployEnv,
  readVercelHeaders,
} from './scripts/build-config.ts'

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  assertDeployEnv(env, Boolean(process.env.VERCEL))

  // O preview (usado pelo E2E) serve os mesmos headers da Vercel, liberando também o
  // Supabase para o qual o build aponta — assim a CSP é exercitada antes do deploy.
  const securityHeaders = readVercelHeaders(
    fileURLToPath(new URL('./vercel.json', import.meta.url)),
  )
  const csp = securityHeaders['Content-Security-Policy']
  if (csp && env.VITE_SUPABASE_URL) {
    securityHeaders['Content-Security-Policy'] = allowSupabaseOrigin(
      csp,
      env.VITE_SUPABASE_URL,
    )
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'Dedic',
          short_name: 'Dedic',
          description: 'Organize aulas, créditos e horários com seu personal.',
          theme_color: '#090f1f',
          background_color: '#090f1f',
          display: 'standalone',
          start_url: '/',
          lang: 'pt-BR',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // Em dev, as funções de api/ rodam à parte via `npm run dev:api`
      // (scripts/dev-api-server.ts) — ver comentário lá para o motivo.
      proxy: {
        '/api': 'http://localhost:3002',
      },
    },
    preview: {
      headers: securityHeaders,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/main.tsx', 'src/test/**'],
      },
    },
  }
})
