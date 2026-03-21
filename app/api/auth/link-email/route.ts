/**
 * POST /api/auth/link-email — saves verified_email for the current user.
 * Used after successful GetCourse subscription check to link payment email.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import * as jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
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

    const decoded = jwt.verify(token, JWT_SECRET) as { user_id: string }

    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { error } = await supabase
      .from('users')
      .update({ verified_email: normalizedEmail, is_premium: true })
      .eq('id', decoded.user_id)

    if (error) {
      console.error('[link-email] update error:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    // Sync telegram_id and username to subscriptions
    const { data: userData } = await supabase
      .from('users')
      .select('telegram_id, username')
      .eq('id', decoded.user_id)
      .single()

    if (userData) {
      await supabase
        .from('subscriptions')
        .update({
          telegram_id: userData.telegram_id,
          tg_username: userData.username,
          updated_at: new Date().toISOString(),
        })
        .eq('email', normalizedEmail)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}
