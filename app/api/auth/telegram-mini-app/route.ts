/**
 * POST /api/auth/telegram-mini-app — upserts a user by telegram_id (no HMAC check).
 * Legacy endpoint kept for compatibility; AuthProvider now uses /api/auth/telegram-sync instead.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { telegram_id, username, first_name } = await request.json()

  if (!telegram_id) {
    return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 })
  }

  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegram_id)
    .single()

  let isNewUser = false

  if (!user) {
    isNewUser = true
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        telegram_id,
        username: username ?? null,
        first_name: first_name ?? null,
        is_premium: false,
      })
      .select()
      .single()

    if (error) {
      console.error('[telegram-mini-app] insert error:', error.message)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
    user = newUser
  } else {
    // Update name/username if changed
    const needsUpdate =
      user.first_name !== (first_name ?? null) ||
      user.username !== (username ?? null)

    if (needsUpdate) {
      const { data: updated } = await supabase
        .from('users')
        .update({ first_name: first_name ?? null, username: username ?? null })
        .eq('telegram_id', telegram_id)
        .select()
        .single()
      if (updated) user = updated
    }
  }

  return NextResponse.json({ user, isNewUser })
}
