/**
 * POST /api/auth/login — authenticates an email/password user and sets a JWT session cookie.
 * If the user has a `supabase_user_id`, delegates password check to Supabase Auth;
 * otherwise falls back to bcrypt comparison against `password_hash`.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'

function sanitizeUser(user: Record<string, unknown>) {
  const { password_hash, reset_token, reset_token_expires_at, ...safe } = user
  void password_hash; void reset_token; void reset_token_expires_at
  return safe
}

export async function POST(request: Request) {
  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const anonSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const JWT_SECRET = process.env.JWT_SECRET!

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    let user: Record<string, any> | null = null

    // 1. Try Supabase Auth first (covers linked users + users after disconnect)
    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({ email, password })

    if (!signInError && signInData.user) {
      const supabaseUserId = signInData.user.id

      // Find user in our table by supabase_user_id
      const { data: bySupabaseId } = await serviceSupabase
        .from('users')
        .select('*')
        .eq('supabase_user_id', supabaseUserId)
        .maybeSingle()

      if (bySupabaseId) {
        user = bySupabaseId
      } else {
        // Try by email (user may exist but supabase_user_id was cleared)
        const { data: byEmail } = await serviceSupabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle()

        if (byEmail) {
          // Re-link supabase_user_id
          const { data: updated } = await serviceSupabase
            .from('users')
            .update({ supabase_user_id: supabaseUserId })
            .eq('id', byEmail.id)
            .select('*')
            .single()
          user = updated ?? byEmail
        } else {
          // Create new user (e.g. after disconnect cleared both email and supabase_user_id)
          const { data: newUser } = await serviceSupabase
            .from('users')
            .insert({ email, supabase_user_id: supabaseUserId, auth_provider: 'email' })
            .select('*')
            .single()
          user = newUser
        }
      }
    } else if (signInError) {
      const msg = signInError.message.toLowerCase()
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        return NextResponse.json({ error: 'email_not_confirmed' }, { status: 401 })
      }

      // 2. Fallback: bcrypt for legacy web-registered users (not in Supabase Auth)
      const { data: legacyUser } = await serviceSupabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (legacyUser?.password_hash) {
        const valid = await bcrypt.compare(password, legacyUser.password_hash)
        if (valid) user = legacyUser
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // 3. Issue our custom JWT session
    const token = jwt.sign(
      { user_id: user.id, email: user.email ?? email },
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
    console.error('[login] error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
