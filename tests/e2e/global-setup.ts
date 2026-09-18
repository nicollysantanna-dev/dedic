import { execSync } from 'node:child_process'

// Recria o banco local com migrações e seed para que cada execução parta do mesmo estado.
export default function globalSetup() {
  if (process.env.E2E_SKIP_DB_RESET === '1') return
  execSync('npx supabase db reset', { stdio: 'inherit' })
}
