/**
 * GET /api/auth/session — validates the JWT session cookie and returns the sanitized user record.
 * Returns 401 if the cookie is missing or invalid.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import * as jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

function sanitizeUser(user: Record<string, unknown>) {
  const { password_hash, reset_token, reset_token_expires_at, ...safe } = user
  void password_hash; void reset_token; void reset_token_expires_at
  return safe
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const JWT_SECRET = process.env.JWT_SECRET!

  try {
    const token = cookies().get('session')?.value

    if (!token) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }

    // JWT payload contains user_id (both email and telegram-widget sessions)
    const decoded = jwt.verify(token, JWT_SECRET) as { user_id: string }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.user_id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Sync email_confirmed_at from auth.users (source of truth)
    if (user.supabase_user_id && !user.email_confirmed_at) {
      const { data: authUserData } = await supabase.auth.admin.getUserById(user.supabase_user_id)
      if (authUserData?.user?.email_confirmed_at) {
        await supabase.from('users').update({
          email_confirmed_at: authUserData.user.email_confirmed_at,
        }).eq('id', user.id)
        user.email_confirmed_at = authUserData.user.email_confirmed_at
      }
    }

    return NextResponse.json({ user: sanitizeUser(user) })
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}
