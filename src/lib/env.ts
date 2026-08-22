import { z } from 'zod'

const publicEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url().optional(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  VITE_APP_TIMEZONE: z.string().min(1).default('America/Sao_Paulo'),
})

export const publicEnv = publicEnvSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || undefined,
  VITE_SUPABASE_PUBLISHABLE_KEY:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || undefined,
  VITE_APP_TIMEZONE: import.meta.env.VITE_APP_TIMEZONE || undefined,
})

export const isSupabaseConfigured = Boolean(
  publicEnv.VITE_SUPABASE_URL && publicEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
)
