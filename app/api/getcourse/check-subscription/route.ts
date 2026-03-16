/**
 * POST /api/getcourse/check-subscription — checks if a user has an active
 * subscription in GetCourse via the Export API (2-step: start export → fetch result).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://online.badbuddhas.ru/pl/api/account'

async function waitForExport(exportId: string, apiKey: string) {
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 2000))

    const res = await fetch(`${BASE_URL}/exports/${exportId}?key=${apiKey}`)
    const data = await res.json()
    console.log(`[check-subscription] export poll attempt ${i + 1}:`, JSON.stringify(data).substring(0, 500))

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

    // 1. Check local subscriptions table first
    const { data: localSub } = await supabase
      .from('subscriptions')
      .select('status, expires_at')
      .eq('email', normalizedEmail)
      .eq('status', 'active')
      .maybeSingle()

    if (localSub) {
      console.log('[check-subscription] found active local subscription for:', normalizedEmail)
      return NextResponse.json({ hasSubscription: true })
    }

    // 2. Export API Step 1: Start user export filtered by email
    const userExportUrl = `${BASE_URL}/users?key=${apiKey}&email=${encodeURIComponent(normalizedEmail)}`
    console.log('[check-subscription] Step 1: requesting user export for:', normalizedEmail)

    const step1 = await fetch(userExportUrl)
    const step1Data = await step1.json()
    console.log('[check-subscription] Step 1 response:', JSON.stringify(step1Data))

    if (!step1Data.success || !step1Data.info?.export_id) {
      return NextResponse.json({ hasSubscription: false, debug: 'user export failed', step1: step1Data })
    }

    // 3. Export API Step 2: Poll for user export result
    const userData = await waitForExport(step1Data.info.export_id, apiKey)
    console.log('[check-subscription] FULL Step 2 userData:', JSON.stringify(userData))

    if (!userData?.info?.items?.length) {
      console.log('[check-subscription] No items in userData.info:', JSON.stringify(userData?.info))
      return NextResponse.json({ hasSubscription: false, debug: 'user not found' })
    }

    console.log('[check-subscription] Export items structure:', JSON.stringify(userData.info.items))
    // GetCourse export returns items as arrays: items[0][0] = user id
    const gcUserId = userData.info.items[0]?.[0] ?? userData.info.items[0]?.id
    console.log('[check-subscription] Found user ID:', gcUserId)
    if (!gcUserId) {
      console.log('[check-subscription] First item has no id:', JSON.stringify(userData.info.items[0]))
      return NextResponse.json({ hasSubscription: false, debug: 'no user id in export' })
    }

    // 4. Export API Step 3: Start deals export for this user (paid only)
    const dealsUrl = `${BASE_URL}/deals?key=${apiKey}&user_id=${gcUserId}&status=payed`
    console.log('[check-subscription] Step 3: requesting deals export for user', gcUserId)

    const step3 = await fetch(dealsUrl)
    const step3Data = await step3.json()
    console.log('[check-subscription] Step 3 response:', JSON.stringify(step3Data))

    if (!step3Data.success || !step3Data.info?.export_id) {
      return NextResponse.json({ hasSubscription: false, debug: 'deals export failed', step3: step3Data })
    }

    // 5. Export API Step 4: Poll for deals export result
    const dealsData = await waitForExport(step3Data.info.export_id, apiKey)
    console.log('[check-subscription] FULL Step 4 dealsData:', JSON.stringify(dealsData))

    const hasPaidDeals = dealsData?.info?.items?.length > 0
    console.log('[check-subscription] Result: hasPaidDeals =', hasPaidDeals)

    // 6. If paid deals found — sync to local subscriptions table
    if (hasPaidDeals) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('verified_email', normalizedEmail)
        .maybeSingle()

      if (user) {
        await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: user.id,
              email: normalizedEmail,
              status: 'active',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
      }
    }

    return NextResponse.json({ hasSubscription: hasPaidDeals })
  } catch (error) {
    console.error('[check-subscription] error:', error)
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 })
  }
}
