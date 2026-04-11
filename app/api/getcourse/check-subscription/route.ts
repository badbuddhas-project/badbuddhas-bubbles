/**
 * POST /api/getcourse/check-subscription — checks if a user has an active
 * subscription in GetCourse via the Export API (2-step: start export → fetch result).
 * Caches result in Supabase subscriptions table.
 *
 * IMPORTANT: This route does NOT update users.is_premium directly.
 * That responsibility belongs to /api/auth/link-email which is called
 * by the client after a successful check, using the correct user_id.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://online.badbuddhas.ru/pl/api/account'

async function waitForExport(exportId: string, apiKey: string) {
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 3000))

    const res = await fetch(`${BASE_URL}/exports/${exportId}?key=${apiKey}`)
    const data = await res.json()

    if (data.success && data.info?.items) return data
  }
  return null
}

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { email, telegram_id } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const apiKey = process.env.GETCOURSE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.log('[check-subscription] requesting for:', normalizedEmail)

    // 1. Check cache in Supabase subscriptions
    const { data: cached } = await supabase
      .from('subscriptions')
      .select('status, expires_at')
      .eq('email', normalizedEmail)
      .eq('status', 'active')
      .maybeSingle()

    if (cached) {
      const isExpired = cached.expires_at && new Date(cached.expires_at) <= new Date()

      if (!isExpired) {
        console.log('[check-subscription] Cache hit (valid) for:', normalizedEmail)
        // Ensure the real user (by telegram_id) has is_premium=true
        if (telegram_id) {
          await supabase
            .from('users')
            .update({ is_premium: true, email: normalizedEmail, verified_email: normalizedEmail })
            .eq('telegram_id', telegram_id)
        }
        return NextResponse.json({ hasSubscription: true, cached: true })
      }

      // Cache expired — will re-check via GetCourse API below
      console.log('[check-subscription] Cache expired for:', normalizedEmail)
    }

    // 2. Export API Step 1: Start user export filtered by email
    const step1 = await fetch(
      `${BASE_URL}/users?key=${apiKey}&email=${encodeURIComponent(normalizedEmail)}`
    )
    const step1Data = await step1.json()

    if (!step1Data.success || !step1Data.info?.export_id) {
      return NextResponse.json({ hasSubscription: false, debug: 'user export failed' })
    }

    // 3. Export API Step 2: Poll for user export result
    const userData = await waitForExport(step1Data.info.export_id, apiKey)

    if (!userData?.info?.items?.length) {
      return NextResponse.json({ hasSubscription: false, debug: 'user not found' })
    }

    // GetCourse export returns items as arrays: items[0][0] = user id
    const gcUserId = userData.info.items[0]?.[0] ?? userData.info.items[0]?.id
    console.log('[check-subscription] Found user ID:', gcUserId)

    if (!gcUserId) {
      return NextResponse.json({ hasSubscription: false, debug: 'no user id in export' })
    }

    // 4. Export API Step 3: Start deals export for this user (paid only)
    const step3 = await fetch(
      `${BASE_URL}/deals?key=${apiKey}&user_id=${gcUserId}&status=payed`
    )
    const step3Data = await step3.json()

    if (!step3Data.success || !step3Data.info?.export_id) {
      return NextResponse.json({ hasSubscription: false, debug: 'deals export failed' })
    }

    // 5. Export API Step 4: Poll for deals export result
    const dealsData = await waitForExport(step3Data.info.export_id, apiKey)

    const hasPaidDeals = dealsData?.info?.items?.length > 0
    console.log('[check-subscription] Result:', hasPaidDeals)

    // 6. Find the REAL user — prefer telegram_id (TG), fallback to email (web)
    let realUser: { id: string; telegram_id: number | null; username: string | null } | null = null

    if (telegram_id) {
      const { data } = await supabase
        .from('users')
        .select('id, telegram_id, username')
        .eq('telegram_id', telegram_id)
        .single()
      realUser = data
      console.log('[check-subscription] Found user by telegram_id:', realUser?.id)
    }

    if (!realUser) {
      const { data } = await supabase
        .from('users')
        .select('id, telegram_id, username')
        .or(`email.eq.${normalizedEmail},verified_email.eq.${normalizedEmail}`)
        .maybeSingle()
      realUser = data
      console.log('[check-subscription] Found user by email:', realUser?.id)
    }

    // 7. If paid deals found — update real user and cache subscription
    if (hasPaidDeals) {
      const dealId = String(dealsData.info.items[0]?.[0] ?? '')

      if (realUser) {
        // Update the real user's premium status and email
        await supabase
          .from('users')
          .update({ is_premium: true, email: normalizedEmail, verified_email: normalizedEmail })
          .eq('id', realUser.id)

        // Upsert subscription for this user
        await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: realUser.id,
              email: normalizedEmail,
              status: 'active',
              gc_deal_id: dealId || null,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
              ...(realUser.telegram_id ? { telegram_id: realUser.telegram_id } : {}),
              ...(realUser.username ? { tg_username: realUser.username } : {}),
            },
            { onConflict: 'user_id' }
          )

        // Clean up any email-only duplicate user (no telegram_id)
        if (realUser.telegram_id) {
          await supabase
            .from('users')
            .delete()
            .eq('email', normalizedEmail)
            .is('telegram_id', null)
            .neq('id', realUser.id)
        }

        console.log('[check-subscription] Updated real user:', realUser.id, 'is_premium=true')
      } else {
        // No user found at all — cache subscription by email only
        await supabase
          .from('subscriptions')
          .upsert(
            {
              email: normalizedEmail,
              status: 'active',
              gc_deal_id: dealId || null,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'email' }
          )
        console.log('[check-subscription] No user found, cached subscription by email only')
      }
    }

    // If cache was expired and GetCourse did NOT confirm — mark as expired
    if (!hasPaidDeals && cached) {
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('email', normalizedEmail)

      if (realUser) {
        await supabase
          .from('users')
          .update({ is_premium: false })
          .eq('id', realUser.id)
      }

      console.log('[check-subscription] Subscription expired for:', normalizedEmail)
    }

    return NextResponse.json({ hasSubscription: hasPaidDeals })
  } catch (error) {
    console.error('[check-subscription] error:', error)
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 })
  }
}
