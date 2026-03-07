/**
 * POST /api/auth/check-email — checks whether an email exists in the database and whether
 * it has a password set. Used by ConnectEmailModal to decide which step to show next.
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
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const { data } = await supabase
      .from('users')
      .select('id, password_hash, telegram_id')
      .eq('email', email)
      .maybeSingle()

    return NextResponse.json({
      exists:       !!data,
      hasPassword:  !!data?.password_hash,
      has_telegram: !!data?.telegram_id,
    })
  } catch (err) {
    console.error('[check-email]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
