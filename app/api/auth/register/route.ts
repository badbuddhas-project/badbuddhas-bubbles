/**
 * POST /api/auth/register — creates a new email/password user, hashes the password with bcrypt,
 * and sets a JWT session cookie on success.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'

// Strip sensitive fields before sending user to client
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
  const JWT_SECRET = process.env.JWT_SECRET!

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Check email not already taken
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash, is_premium: false, auth_provider: 'email' })
      .select()
      .single()

    if (error) {
      console.error('[register] insert error:', error.message)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const token = jwt.sign(
      { user_id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '180d' }
    )

    const response = NextResponse.json({ success: true, user: sanitizeUser(user) })
    response.cookies.set('session', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 180,
      path:     '/',
    })

    return response
  } catch (error) {
    console.error('[register] error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
