/**
 * POST /api/getcourse/check-subscription — checks if a user has an active
 * subscription in GetCourse via the Export API (2-step: start export → fetch result).
 * Caches result in Supabase subscriptions table.
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
      console.log('[check-subscription] Cache hit for:', normalizedEmail)
      return NextResponse.json({ hasSubscription: true, cached: true })
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

    // 6. If paid deals found — cache in Supabase subscriptions
    if (hasPaidDeals) {
      // Try to find user by email or verified_email
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${normalizedEmail},verified_email.eq.${normalizedEmail}`)
        .maybeSingle()

      if (user) {
        const dealId = String(dealsData.info.items[0]?.[0] ?? '')
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: user.id,
              email: normalizedEmail,
              status: 'active',
              gc_deal_id: dealId || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )

        if (subError) {
          console.error('[check-subscription] Supabase upsert error:', subError)
        } else {
          console.log('[check-subscription] Subscription saved for user:', user.id)
        }
      } else {
        console.log('[check-subscription] User not found in Supabase, subscription not cached')
      }
    }

    return NextResponse.json({ hasSubscription: hasPaidDeals })
  } catch (error) {
    console.error('[check-subscription] error:', error)
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 })
  }
}
