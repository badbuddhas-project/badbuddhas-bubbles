/**
 * POST /api/auth/disconnect-email — unlinks email from a Telegram account.
 * Clears email, supabase_user_id, email_confirmed_at, password_hash in users table.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { telegram_id } = await request.json()

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id required' }, { status: 400 })
    }

    // Find the user and save supabase_user_id before clearing
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, supabase_user_id, email')
      .eq('telegram_id', telegram_id)
      .maybeSingle()

    if (findError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.email) {
      return NextResponse.json({ error: 'No email connected' }, { status: 400 })
    }

    // Clear email fields
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email: null,
        supabase_user_id: null,
        email_confirmed_at: null,
        password_hash: null,
      })
      .eq('telegram_id', telegram_id)

    if (updateError) {
      console.error('[disconnect-email] update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to disconnect email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[disconnect-email]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
