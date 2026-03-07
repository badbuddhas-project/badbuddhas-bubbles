import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export type TypedSupabaseClient = ReturnType<typeof createBrowserClient<Database>>

// Singleton — safe on the client (one browser session).
// Uses @supabase/ssr so auth tokens are stored in cookies,
// which server-side middleware can read.
let clientInstance: TypedSupabaseClient | null = null

export function getSupabaseClient(): TypedSupabaseClient {
  if (!clientInstance) {
    clientInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return clientInstance
}
