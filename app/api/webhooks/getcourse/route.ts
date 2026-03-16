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
    const body = await request.json()
    const { email, status, deal_id } = body

    // Validate webhook secret
    const webhookSecret = request.headers.get('x-gc-webhook-secret') ?? body.webhook_secret
    if (webhookSecret !== process.env.GETCOURSE_WEBHOOK_SECRET) {
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
            gc_deal_id: deal_id ?? null,
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
