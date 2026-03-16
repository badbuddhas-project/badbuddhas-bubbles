/**
 * POST /api/auth/verify-otp — verifies the 6-digit OTP code and links
 * the verified email to the current user's profile.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import * as jwt from 'jsonwebtoken'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const JWT_SECRET = process.env.JWT_SECRET!

  try {
    const { email, token } = await request.json()

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and token are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Verify OTP via Supabase Auth
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token,
      type: 'email',
    })

    if (otpError) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }

    // Get current user from session cookie
    const sessionToken = cookies().get('session')?.value
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }

    const decoded = jwt.verify(sessionToken, JWT_SECRET) as { user_id: string }

    // Update verified_email on the user record
    const { error: updateError } = await supabase
      .from('users')
      .update({ verified_email: normalizedEmail })
      .eq('id', decoded.user_id)

    if (updateError) {
      console.error('[verify-otp] update error:', updateError)
      return NextResponse.json({ error: 'Failed to save verified email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, email: normalizedEmail })
  } catch (error) {
    console.error('[verify-otp] error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
