/**
 * POST /api/auth/link-email — saves email for the current user.
 * Used by EmailGate (email collection) and subscription activation flow.
 * Supports both JWT cookie (web) and telegram_id (Telegram Mini App).
 *
 * Body: { email: string, telegram_id?: number, activate_premium?: boolean }
 * - activate_premium: true → also sets is_premium=true and creates subscription record
 *   (used after successful GetCourse check)
 * - activate_premium: false/absent → only saves email (used by EmailGate)
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import * as jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const JWT_SECRET = process.env.JWT_SECRET!

  try {
    const body = await request.json()
    const { email, telegram_id, activate_premium } = body
    console.log('[link-email] Request body:', JSON.stringify({ email, telegram_id, activate_premium }))

    if (!email || typeof email !== 'string') {
      console.log('[link-email] Missing email, returning 400')
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    let userId: string | null = null

    // Auth method 1 (priority): telegram_id from body — lookup real user in our users table
    if (telegram_id) {
      console.log('[link-email] Looking up user by telegram_id:', telegram_id)
      const { data: tgUser, error: lookupErr } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegram_id)
        .single()

      if (lookupErr) {
        console.error('[link-email] TG user lookup error:', lookupErr.message)
      }
      userId = tgUser?.id ?? null
      console.log('[link-email] TG user lookup result:', userId)
    }

    // Auth method 2 (fallback): JWT cookie — resolve to users table id
    if (!userId) {
      const token = cookies().get('session')?.value
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { user_id: string }
          const jwtUserId = decoded.user_id
          console.log('[link-email] JWT user_id from cookie:', jwtUserId)

          // JWT user_id may be a Supabase Auth UUID — look up our users table
          const { data: jwtUser } = await supabase
            .from('users')
            .select('id')
            .eq('supabase_user_id', jwtUserId)
            .maybeSingle()

          if (jwtUser) {
            userId = jwtUser.id
            console.log('[link-email] Found user by supabase_user_id:', userId)
          } else {
            // Try direct match (in case JWT stores our users.id)
            const { data: directUser } = await supabase
              .from('users')
              .select('id')
              .eq('id', jwtUserId)
              .maybeSingle()
            userId = directUser?.id ?? null
            console.log('[link-email] Direct id lookup result:', userId)
          }
        } catch { /* invalid token */ }
      }
    }

    if (!userId) {
      console.log('[link-email] No user found, returning 401')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Build update payload — only set is_premium when explicitly activating
    const updatePayload: Record<string, unknown> = {
      email: normalizedEmail,
      verified_email: normalizedEmail,
    }
    if (activate_premium) {
      updatePayload.is_premium = true
    }

    console.log('[link-email] Updating user', userId, 'with:', JSON.stringify(updatePayload))
    const { data: updateData, error: updateErr } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, email, verified_email, is_premium, telegram_id')
      .single()

    if (updateErr) {
      console.error('[link-email] Update error:', updateErr.message, updateErr.details, updateErr.hint)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    console.log('[link-email] Update result:', JSON.stringify(updateData))

    // Create/update subscription record only when activating premium
    if (activate_premium) {
      const telegramId = updateData?.telegram_id ?? null
      const { data: userData } = await supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .single()
      const tgUsername = userData?.username ?? null

      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (!existingSub) {
        const { error: insErr } = await supabase.from('subscriptions').insert({
          user_id: userId,
          email: normalizedEmail,
          status: 'active',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          telegram_id: telegramId,
          tg_username: tgUsername,
        })
        console.log('[link-email] Created subscription for user:', userId, insErr ? `error: ${insErr.message}` : 'OK')
      } else {
        const { error: updErr } = await supabase
          .from('subscriptions')
          .update({
            user_id: userId,
            status: 'active',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            telegram_id: telegramId,
            tg_username: tgUsername,
            updated_at: new Date().toISOString(),
          })
          .eq('email', normalizedEmail)
        console.log('[link-email] Updated subscription for user:', userId, updErr ? `error: ${updErr.message}` : 'OK')
      }
    }

    // Получить данные юзера для ГК
    const { data: gcUserData } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single()

    // Синхронизировать в ГК (await — иначе Vercel убивает процесс при return)
    console.log('[link-email] Calling GC sync for:', normalizedEmail)
    const gcResult = await syncUserToGetCourse(
      normalizedEmail,
      gcUserData?.first_name || '',
      gcUserData?.last_name || ''
    )
    console.log('[link-email] GC sync result:', JSON.stringify(gcResult))

    console.log('[link-email] Success for user', userId, 'email:', normalizedEmail, 'premium:', !!activate_premium)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[link-email] Unhandled error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function syncUserToGetCourse(email: string, firstName: string, lastName: string) {
  try {
    console.log('[GC sync] Starting for email:', email)
    const apiKey = process.env.GETCOURSE_WRITE_API_KEY
    console.log('[GC sync] API key exists:', !!apiKey)
    if (!apiKey) {
      console.warn('[GC sync] No GETCOURSE_WRITE_API_KEY found')
      return
    }

    // 1. Собрать объект параметров
    const paramsObj = {
      user: {
        email,
        first_name: firstName || '',
        last_name: lastName || '',
      },
      system: {
        refresh_if_exists: 1,
      },
    }

    // 2. JSON → base64
    const paramsBase64 = Buffer.from(JSON.stringify(paramsObj)).toString('base64')

    // 3. POST как form-data (application/x-www-form-urlencoded)
    const body = new URLSearchParams({
      action: 'add',
      key: apiKey,
      params: paramsBase64,
    })

    const res = await fetch('https://online.badbuddhas.ru/pl/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    const data = await res.json()
    console.log('[GC sync] response:', JSON.stringify(data))

    if (!data.success) {
      console.error('[GC sync] error:', data.error)
    }
  } catch (e) {
    console.error('[GC sync] failed (non-critical):', e)
  }
}
