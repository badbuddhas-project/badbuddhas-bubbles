/**
 * GET /api/auth/email-status?telegram_id=XXX — returns whether the user's email has been confirmed.
 * Polled every 5 s by ProfilePage after ConnectEmailModal sends a confirmation email.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET /api/auth/email-status?telegram_id=XXX
// Returns current email confirmation status for a Telegram user.
// Called by the profile page to poll for changes after the user confirms
// their email in a browser tab.
export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { searchParams } = new URL(request.url)
  const telegram_id = searchParams.get('telegram_id')

  if (!telegram_id) {
    return NextResponse.json({ error: 'telegram_id required' }, { status: 400 })
  }

  const { data: user } = await supabase
    .from('users')
    .select('email, email_confirmed_at')
    .eq('telegram_id', Number(telegram_id))
    .maybeSingle()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    email:     user.email,
    confirmed: !!user.email_confirmed_at,
  })
}
