import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// IMPORTANT — ISOLATION WARNING
//
// This module uses the SUPABASE_SERVICE_ROLE_KEY which has **unlimited**
// privileges and entirely bypasses Row-Level Security (RLS).
//
// DO NOT import this module from:
//   - Client Components
//   - `'use client'` boundaries
//   - Any code that may end up in a browser bundle
//
// The `server-only` import above causes a build error if this module is
// accidentally imported on the client side.
// ---------------------------------------------------------------------------

export type Database = any

let _serviceClient: SupabaseClient<Database> | null = null

/**
 * Returns a Supabase client initialised with the service-role key.
 *
 * This client is intended for privileged server-side operations such as:
 * - User provisioning (auth.admin.*)
 * - Bypassing RLS for admin-level DB queries
 * - Background / cron jobs
 *
 * The client has `auth.autoRefreshToken` and `auth.persistSession` disabled
 * because the service key does not expire and there is no user session to
 * persist.
 */
export function createServiceClient(): SupabaseClient<Database> {
  if (_serviceClient) return _serviceClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!serviceKey) {
    throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY')
  }

  _serviceClient = createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _serviceClient
}
