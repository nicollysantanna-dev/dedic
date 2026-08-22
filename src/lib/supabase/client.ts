import { createClient } from '@supabase/supabase-js'

import { isSupabaseConfigured, publicEnv } from '@/lib/env'
import type { Database } from '@/lib/supabase/database.types'

function createSupabaseBrowserClient() {
  const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } = publicEnv

  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase ainda não foi configurado neste ambiente.')
  }

  return createClient<Database>(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
}

export const supabase = isSupabaseConfigured ? createSupabaseBrowserClient() : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase ainda não foi configurado neste ambiente.')
  }

  return supabase
}
