/**
 * POST /api/auth/link-email — saves verified_email for the current user.
 * Used after successful GetCourse subscription check to link payment email.
 * Supports both JWT cookie (web) and telegram_id (Telegram Mini App).
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
    const { email, telegram_id } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    let userId: string | null = null

    // Auth method 1: JWT cookie (web)
    const token = cookies().get('session')?.value
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { user_id: string }
        userId = decoded.user_id
      } catch { /* invalid token, try telegram */ }
    }

    // Auth method 2: telegram_id from body (Telegram Mini App)
    if (!userId && telegram_id) {
      const { data: tgUser } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegram_id)
        .single()
      userId = tgUser?.id ?? null
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { error } = await supabase
      .from('users')
      .update({ email: normalizedEmail, verified_email: normalizedEmail, is_premium: true })
      .eq('id', userId)

    if (error) {
      console.error('[link-email] update error:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    // Ensure subscription record exists
    const { data: userData } = await supabase
      .from('users')
      .select('telegram_id, username')
      .eq('id', userId)
      .single()

    const telegramId = userData?.telegram_id ?? null
    const tgUsername = userData?.username ?? null

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!existingSub) {
      await supabase.from('subscriptions').insert({
        user_id: userId,
        email: normalizedEmail,
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        telegram_id: telegramId,
        tg_username: tgUsername,
      })
      console.log('[link-email] Created subscription for user:', userId)
    } else {
      await supabase
        .from('subscriptions')
        .update({
          user_id: userId,
          status: 'active',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          telegram_id: telegramId,
          tg_username: tgUsername,
          updated_at: new Date().toISOString(),
        })
        .eq('email', normalizedEmail)
      console.log('[link-email] Updated subscription for user:', userId)
    }

    console.log('[link-email] Updated user', userId, 'with email', normalizedEmail)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}
