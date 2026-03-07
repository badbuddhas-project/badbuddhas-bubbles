/**
 * POST /api/auth/reset-password — validates the reset token (expiry check) and updates
 * the user's `password_hash`; clears the token fields afterwards.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Find user by reset token
    const { data: user } = await supabase
      .from('users')
      .select('id, reset_token, reset_token_expires_at')
      .eq('reset_token', token)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    // Check expiry
    if (user.reset_token_expires_at) {
      const expiresAt = new Date(user.reset_token_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 })
      }
    }

    const password_hash = await bcrypt.hash(password, 10)

    // Update password and clear token
    const { error } = await supabase
      .from('users')
      .update({
        password_hash,
        reset_token:            null,
        reset_token_expires_at: null,
      })
      .eq('id', user.id)

    if (error) {
      console.error('[reset-password] update error:', error.message)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reset-password] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
