/**
 * POST /api/auth/connect-email — links an email address to an existing Telegram account.
 * Calls Supabase Auth signUp to send a confirmation email, then stores the bcrypt hash locally.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// Handles two things:
// 1. Calls supabase.auth.signUp() — Supabase sends the confirmation email automatically
//    using the custom email template configured in Supabase Dashboard:
//    {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
//    This bypasses PKCE — verifyOtp(token_hash) works cross-device/cross-browser.
// 2. Stores password_hash in users table so /api/auth/login works via bcrypt fallback
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

  try {
    const { telegram_id, email, password } = await request.json()

    if (!telegram_id || !email || !password) {
      return NextResponse.json({ error: 'telegram_id, email, and password required' }, { status: 400 })
    }

    // Make sure this email isn't already taken by a *different* Telegram user
    const { data: existing } = await serviceSupabase
      .from('users')
      .select('id, telegram_id')
      .eq('email', email)
      .maybeSingle()

    if (existing && existing.telegram_id !== telegram_id) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    // signUp — Supabase sends the confirmation email using the custom template
    // configured in Dashboard: ?token_hash={{ .TokenHash }}&type=signup
    // The token_hash in the link is verified by verifyOtp (no PKCE code_verifier needed).
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://badbuddhas-bubbles.vercel.app'

    const { data: authData, error: signUpError } = await anonSupabase.auth.signUp({
      email,
      password,
      options: {
        data:            { telegram_id },
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        return NextResponse.json({ exists: true })
      }
      console.error('[connect-email] signUp error:', signUpError.message)
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    // Hash password for bcrypt fallback in /api/auth/login
    const password_hash = await bcrypt.hash(password, 10)

    const { error: updateError } = await serviceSupabase
      .from('users')
      .update({
        email,
        supabase_user_id:   authData.user?.id ?? null,
        password_hash,
        email_confirmed_at: null, // set by /auth/callback when user clicks the link
      })
      .eq('telegram_id', telegram_id)

    if (updateError) {
      console.error('[connect-email] update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to link email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[connect-email]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
