/**
 * POST /api/webhooks/getcourse — handles payment callbacks from GetCourse.
 * Updates subscription status in our database when a user pays or their
 * subscription expires.
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
    const url = new URL(request.url)

    // Read from query params first (GetCourse "Вызвать URL" sends data this way)
    let email = url.searchParams.get('email')
    let status = url.searchParams.get('status')
    let dealId = url.searchParams.get('deal_id')
    let secret = url.searchParams.get('secret')
      ?? request.headers.get('x-gc-webhook-secret')

    // Fall back to JSON body for compatibility
    if (!email || !status) {
      try {
        const body = await request.json()
        email = email || body.email
        status = status || body.status
        dealId = dealId || body.deal_id
        secret = secret || body.webhook_secret || body.secret
      } catch {
        // Body may not be JSON — that's fine if we got query params
      }
    }

    // Validate webhook secret
    if (secret !== process.env.GETCOURSE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!email || !status) {
      return NextResponse.json({ error: 'email and status are required' }, { status: 400 })
    }

    if (status !== 'active' && status !== 'expired') {
      return NextResponse.json({ error: 'status must be "active" or "expired"' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find user by verified_email
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('verified_email', normalizedEmail)
      .maybeSingle()

    if (!user) {
      // User hasn't verified this email yet — store for later matching
      console.warn('[getcourse-webhook] no user found for email:', normalizedEmail)
      return NextResponse.json({ success: true, warning: 'user not found' })
    }

    if (status === 'active') {
      await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: user.id,
            email: normalizedEmail,
            status: 'active',
            gc_deal_id: dealId ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
    } else {
      // status === 'expired'
      await supabase
        .from('subscriptions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[getcourse-webhook] error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
