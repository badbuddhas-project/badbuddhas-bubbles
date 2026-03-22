/**
 * POST /api/auth/telegram-sync — upserts a Telegram Mini App user and returns sanitized user data.
 * Called by AuthProvider on every app open; also returns `isNewUser` to trigger onboarding.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  try {
    const { telegram_id, username, first_name } = await request.json()

    if (!telegram_id) {
      return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 })
    }

    // Check if user already exists (for isNewUser flag)
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegram_id)
      .maybeSingle()

    const isNewUser = !existing

    // Upsert: insert or update on conflict — avoids duplicate key errors
    const { data: user, error } = await supabase
      .from('users')
      .upsert(
        {
          telegram_id,
          username:   username   ?? null,
          first_name: first_name ?? null,
          ...(isNewUser ? { is_premium: false } : {}),
        },
        { onConflict: 'telegram_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[telegram-sync] upsert error:', error.message)
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
    }

    // Sync email_confirmed_at from auth.users (source of truth)
    if (user.supabase_user_id && !user.email_confirmed_at) {
      const { data: authUser } = await supabase.auth.admin.getUserById(user.supabase_user_id)
      if (authUser?.user?.email_confirmed_at) {
        user.email_confirmed_at = authUser.user.email_confirmed_at
        await supabase.from('users').update({
          email_confirmed_at: authUser.user.email_confirmed_at,
        }).eq('id', user.id)
      }
    }

    // Auto-check subscription expiry if user has verified_email
    if (user.verified_email) {
      try {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status, expires_at')
          .eq('email', user.verified_email)
          .eq('status', 'active')
          .maybeSingle()

        const needsRecheck =
          (sub && sub.expires_at && new Date(sub.expires_at) < new Date()) ||
          (!sub && user.is_premium)

        if (needsRecheck) {
          console.log('[telegram-sync] Subscription expired/missing, re-checking:', user.verified_email)
          const checkRes = await fetch(new URL('/api/getcourse/check-subscription', request.url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.verified_email }),
          })
          const checkData = await checkRes.json()

          if (!checkData.hasSubscription) {
            await supabase.from('users').update({ is_premium: false }).eq('id', user.id)
            await supabase
              .from('subscriptions')
              .update({ status: 'expired', updated_at: new Date().toISOString() })
              .eq('email', user.verified_email)
            user.is_premium = false
            console.log('[telegram-sync] Subscription deactivated:', user.verified_email)
          } else {
            user.is_premium = true
            console.log('[telegram-sync] Subscription renewed:', user.verified_email)
          }
        }
      } catch (err) {
        console.error('[telegram-sync] Subscription check failed (non-blocking):', err)
      }
    }

    return NextResponse.json({ user: sanitizeUser(user), isNewUser })
  } catch (error) {
    console.error('[telegram-sync] error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
