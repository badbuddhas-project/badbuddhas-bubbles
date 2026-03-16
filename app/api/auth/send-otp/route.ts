/**
 * POST /api/auth/send-otp — sends a 6-digit OTP code to the given email
 * via Supabase Auth's built-in OTP flow.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { email } = await request.json()

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Try sending OTP first
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: false },
    })

    // If user doesn't exist in auth.users, create them and retry
    if (error && error.message.toLowerCase().includes('user not found')) {
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: false,
      })

      const { error: retryError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      })

      if (retryError) {
        console.error('[send-otp] retry error:', retryError)
        return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
      }
    } else if (error) {
      console.error('[send-otp] error:', error)
      return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[send-otp] error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
