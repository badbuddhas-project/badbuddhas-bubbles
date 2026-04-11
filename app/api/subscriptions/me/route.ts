/**
 * GET /api/subscriptions/me — returns subscription status for the current user.
 * Uses service role key to bypass RLS.
 * Supports telegram_id (query param) or JWT cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import * as jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    let userId: string | null = null

    // Method 1: telegram_id from query param
    const telegramId = request.nextUrl.searchParams.get('telegram_id')
    if (telegramId) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', parseInt(telegramId))
        .single()
      userId = data?.id ?? null
    }

    // Method 2: JWT cookie
    if (!userId) {
      const token = cookies().get('session')?.value
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { user_id: string }
          // Resolve to our users table
          const { data } = await supabase
            .from('users')
            .select('id')
            .eq('supabase_user_id', decoded.user_id)
            .maybeSingle()
          userId = data?.id ?? null
        } catch { /* invalid token */ }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch subscription by user_id
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, expires_at, email')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    // Fallback: fetch by user's email
    if (!sub) {
      const { data: user } = await supabase
        .from('users')
        .select('email, verified_email')
        .eq('id', userId)
        .single()

      const email = user?.email || user?.verified_email
      if (email) {
        const { data: subByEmail } = await supabase
          .from('subscriptions')
          .select('status, expires_at, email')
          .eq('email', email)
          .eq('status', 'active')
          .maybeSingle()

        if (subByEmail) {
          console.log('[subscriptions/me] Found by email:', email, 'expires_at:', subByEmail.expires_at)
          return NextResponse.json(subByEmail)
        }
      }
    }

    if (sub) {
      console.log('[subscriptions/me] Found by user_id:', userId, 'expires_at:', sub.expires_at)
      return NextResponse.json(sub)
    }

    return NextResponse.json({ status: null, expires_at: null })
  } catch (err) {
    console.error('[subscriptions/me] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
