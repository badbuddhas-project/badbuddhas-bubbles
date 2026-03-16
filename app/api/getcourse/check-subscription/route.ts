/**
 * POST /api/getcourse/check-subscription — checks if a user has an active
 * subscription in GetCourse and syncs the result to our subscriptions table.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // 2. No local record — query GetCourse API (deals endpoint)
    const gcResponse = await fetch('https://online.badbuddhas.ru/pl/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        key: process.env.GETCOURSE_API_KEY!,
        action: 'getDeals',
        params: JSON.stringify({ user: { email: normalizedEmail } }),
      }),
    })

    if (!gcResponse.ok) {
      console.error('[check-subscription] GetCourse API error:', gcResponse.status)
      return NextResponse.json({ error: 'GetCourse API unavailable' }, { status: 502 })
    }

    const gcData = await gcResponse.json()

    console.log('[check-subscription] GetCourse API request email:', normalizedEmail)
    console.log('[check-subscription] GetCourse API response:', JSON.stringify(gcData))

    // GetCourse returns { success: true, info: [...deals] } when user has deals
    const hasSubscription = gcData.success === true
      && Array.isArray(gcData.info)
      && gcData.info.length > 0

    if (hasSubscription) {
      // Find user by verified_email and create local subscription record
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

    return NextResponse.json({ hasSubscription })
  } catch (error) {
    console.error('[check-subscription] error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
