import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Shared type for the database schema.
// Replace `any` with your generated Database type once you run
// `supabase gen types typescript` against your project.
// ---------------------------------------------------------------------------
export type Database = any

// ---------------------------------------------------------------------------
// createClient — use inside Server Components, Server Actions, and Route Handlers.
//
// IMPORTANT: Call this once per request.  Always call `await supabase.auth.getUser()`
// (NOT `getSession()`) when you need the verified user identity for auth decisions.
//
// The client is configured against the transaction pooler (port 6543) when
// that env var is provided; otherwise it falls back to the REST URL.
// ---------------------------------------------------------------------------
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.'
    )
  }

  // Prefer the transaction-pooler URL if provided (port 6543 / pgbouncer).
  const supabaseUrl = process.env.SUPABASE_DB_URL ?? url

  return createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // `setAll` is called from a Server Component context where cookies
          // cannot be written.  This is fine *provided* middleware handles
          // session refreshes.  The client will emit a warning in dev.
        }
      },
    },
  })
}
