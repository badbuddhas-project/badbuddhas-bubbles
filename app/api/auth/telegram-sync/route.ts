/**
 * POST /api/auth/telegram-sync — upserts a Telegram Mini App user and returns sanitized user data.
 * Called by AuthProvider on every app open; also returns `isNewUser` to trigger onboarding.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sanitizeUser(user: Record<string, unknown>) {
  const { password_hash, reset_token, reset_token_expires_at, ...safe } = user
  void password_hash; void reset_token; void reset_token_expires_at
  return safe
}

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { telegram_id, username, first_name } = await request.json()

    if (!telegram_id) {
      return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 })
    }

    // Check if user already exists (for isNewUser flag)
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegram_id)
      .maybeSingle()

    const isNewUser = !existing

    // Upsert: insert or update on conflict — avoids duplicate key errors
    const { data: user, error } = await supabase
      .from('users')
      .upsert(
        {
          telegram_id,
          username:   username   ?? null,
          first_name: first_name ?? null,
          ...(isNewUser ? { is_premium: false } : {}),
        },
        { onConflict: 'telegram_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[telegram-sync] upsert error:', error.message)
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
    }

    return NextResponse.json({ user: sanitizeUser(user), isNewUser })
  } catch (error) {
    console.error('[telegram-sync] error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
