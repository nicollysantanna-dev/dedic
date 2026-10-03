import { defineConfig, devices } from '@playwright/test'

// Chave anon padrão do Supabase local (pública por natureza, sem valor fora do CLI).
const localAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Service role padrão do Supabase local (pública do CLI, sem valor fora do ambiente local).
// Porta própria: evita colidir (ou reutilizar) um `npm run dev:api` já ligado ao .env remoto.
const e2eApiPort = '3102'

const localServiceRoleKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  // As jornadas compartilham o banco local semeado; executar em série evita corridas.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testIgnore: /journeys/ },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --host 127.0.0.1',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 180_000,
      // Força o build a apontar para o Supabase local, mesmo com .env.local remoto.
      env: {
        DEV_API_PORT: e2eApiPort,
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
        VITE_SUPABASE_PUBLISHABLE_KEY:
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? localAnonKey,
      },
    },
    {
      // API local (delete-account) usada pelo preview via proxy /api. Nunca lê o .env:
      // ele aponta para o projeto remoto, e o E2E só pode tocar o Supabase local.
      command: 'npx tsx scripts/dev-api-server.ts',
      port: Number(e2eApiPort),
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DEV_API_PORT: e2eApiPort,
        DEDIC_SKIP_DOTENV: '1',
        SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_SERVICE_ROLE_KEY: localServiceRoleKey,
      },
    },
  ],
})
