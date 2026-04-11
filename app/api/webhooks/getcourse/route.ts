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
    let email: string | null = null
    let status: string | null = null
    let dealId: string | null = null
    let secret: string | null = null

    const contentType = request.headers.get('content-type') || ''

    // GetCourse sends POST with x-www-form-urlencoded
    if (contentType.includes('form-urlencoded')) {
      const formData = await request.formData()
      email = formData.get('email') as string
      status = formData.get('status') as string
      dealId = formData.get('deal_id') as string
      secret = formData.get('secret') as string
    } else {
      // JSON fallback
      try {
        const body = await request.json()
        email = body.email
        status = body.status
        dealId = body.deal_id
        secret = body.secret || body.webhook_secret
      } catch {
        // Body may not be JSON — that's fine if we got query params
      }
    }

    // Also check query params as fallback
    const url = new URL(request.url)
    email = email || url.searchParams.get('email')
    status = status || url.searchParams.get('status')
    dealId = dealId || url.searchParams.get('deal_id')
    secret = secret || url.searchParams.get('secret')
      || request.headers.get('x-gc-webhook-secret')

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
