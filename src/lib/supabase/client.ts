import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Shared type for the database schema.
// Replace `any` with your generated Database type once you run
// `supabase gen types typescript` against your project.
// ---------------------------------------------------------------------------
export type Database = any

// ---------------------------------------------------------------------------
// Singleton — one browser client per page load.
// ---------------------------------------------------------------------------
let _browserClient: SupabaseClient<Database> | null = null

export function createClient(): SupabaseClient<Database> {
  if (_browserClient) return _browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.'
    )
  }

  _browserClient = createBrowserClient<Database>(url, anonKey, {
    isSingleton: true,
  })

  return _browserClient
}

/**
 * Convenience re-export — use createClient() instead of this constant
 * to avoid module-level env var access during build.
 */
export function getSupabase(): SupabaseClient<Database> {
  return createClient()
}
