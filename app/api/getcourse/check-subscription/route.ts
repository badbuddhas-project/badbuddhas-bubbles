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
    const { email } = await request.json()

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
        // Do NOT update users here — link-email handles that with correct user_id
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

    // 6. If paid deals found — upsert subscription cache by email
    //    (link-email will handle user record update with correct user_id)
    if (hasPaidDeals) {
      const dealId = String(dealsData.info.items[0]?.[0] ?? '')

      // Try to find existing user by email for subscription cache
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, telegram_id, username')
        .or(`email.eq.${normalizedEmail},verified_email.eq.${normalizedEmail}`)
        .maybeSingle()

      await supabase
        .from('subscriptions')
        .upsert(
          {
            email: normalizedEmail,
            status: 'active',
            gc_deal_id: dealId || null,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            ...(existingUser ? {
              user_id: existingUser.id,
              ...(existingUser.telegram_id ? { telegram_id: existingUser.telegram_id } : {}),
              ...(existingUser.username ? { tg_username: existingUser.username } : {}),
            } : {}),
          },
          { onConflict: 'email' }
        )

      console.log('[check-subscription] Subscription cached for:', normalizedEmail)
    }

    // If cache was expired and GetCourse did NOT confirm — mark as expired
    if (!hasPaidDeals && cached) {
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('email', normalizedEmail)

      console.log('[check-subscription] Subscription expired for:', normalizedEmail)
    }

    return NextResponse.json({ hasSubscription: hasPaidDeals })
  } catch (error) {
    console.error('[check-subscription] error:', error)
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 })
  }
}
