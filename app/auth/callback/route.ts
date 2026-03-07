import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import * as jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  let authUser = null

  // Flow 1: Email confirmation (token_hash + type=signup)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'email',
    })
    if (!error && data.user) authUser = data.user
  }
  // Flow 2: OAuth / magic link (code)
  else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) authUser = data.user
  }

  // Create users record + session cookie
  if (authUser) {
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find or create user in our users table
    const { data: existingUser } = await serviceSupabase
      .from('users')
      .select('id')
      .eq('supabase_user_id', authUser.id)
      .maybeSingle()

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: newUser } = await serviceSupabase
        .from('users')
        .insert({
          email: authUser.email,
          supabase_user_id: authUser.id,
          auth_provider: 'email',
        })
        .select('id')
        .single()
      userId = newUser!.id
    }

    // Set custom JWT session cookie (same as /api/auth/login)
    const JWT_SECRET = process.env.JWT_SECRET!
    const token = jwt.sign(
      { user_id: userId, email: authUser.email },
      JWT_SECRET,
      { expiresIn: '180d' }
    )

    // Recovery flow → redirect to reset-password page instead of confirm
    const isRecovery = type === 'recovery'
    let redirectUrl: URL
    if (isRecovery) {
      redirectUrl = new URL('/reset-password', requestUrl.origin)
    } else {
      redirectUrl = new URL('/auth/confirm', requestUrl.origin)
      if (authUser.email) redirectUrl.searchParams.set('email', authUser.email)
    }
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 180,
      path: '/',
    })
    return response
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
