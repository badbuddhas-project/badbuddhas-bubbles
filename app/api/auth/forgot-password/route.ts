/**
 * POST /api/auth/forgot-password — generates a 1-hour reset token, stores it in the DB,
 * and sends a reset email via Resend (if RESEND_API_KEY is set).
 * Always returns 200 to prevent email enumeration.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

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

    // Always return success to prevent email enumeration
    const { data: user } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email)
      .maybeSingle()

    if (user && user.password_hash) {
      // Generate a secure reset token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

      // Store token in DB
      await supabase
        .from('users')
        .update({
          reset_token:            token,
          reset_token_expires_at: expiresAt,
        })
        .eq('id', user.id)

      // Send email via Resend (configure RESEND_API_KEY in env)
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://badbuddhas-bubbles.vercel.app'
        const resetLink = `${appUrl}/reset-password?token=${token}`

        await fetch('https://api.resend.com/emails', {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            from:    'BadBuddhas <onboarding@resend.dev>',
            to:      [email],
            subject: 'Reset your BadBuddhas password',
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#000;color:#fff;border-radius:12px;">
                <h1 style="font-size:24px;font-weight:700;letter-spacing:2px;margin-bottom:8px;">BADBUDDHAS</h1>
                <p style="color:#9ca3af;margin-bottom:24px;">Password reset request</p>
                <p style="color:#d1d5db;margin-bottom:24px;">
                  Click the button below to reset your password. This link expires in 1 hour.
                </p>
                <a href="${resetLink}"
                   style="display:inline-block;padding:14px 28px;background:#10b981;color:#000;font-weight:600;border-radius:8px;text-decoration:none;">
                  Reset Password
                </a>
                <p style="color:#6b7280;font-size:12px;margin-top:24px;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            `,
          }),
        })
      }
    }

    // Always return success (no enumeration)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[forgot-password] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
