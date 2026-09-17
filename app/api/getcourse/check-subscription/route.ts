/**
 * POST /api/getcourse/check-subscription — checks if a user has an active
 * subscription in GetCourse via the Export API (2-step: start export → fetch result).
 * Caches result in Supabase subscriptions table.
 *
 * Response: { hasSubscription, status, expiresAt? }
 *   status 'active'  — GC confirmed a real app payment that still covers today
 *   status 'none'    — GC answered, and there is no such payment
 *   status 'unknown' — GC did not answer (export busy/failed/timed out). This is NOT a
 *                      "no": callers must leave existing access alone and retry later.
 *                      Treating it as "no" revoked paying users whenever GC was busy
 *                      (error 905 "Уже запущен один экспорт" — GC runs one export at a
 *                      time per account, and our cron runs big ones).
 *
 * Access is counted from the latest real app payment (+ period + renewal grace), not
 * from the moment of the check — otherwise expiry drifts away from GC's billing date,
 * lapses hours before each autopayment, and locks the user out in between.
 *
 * IMPORTANT: This route does NOT update users.is_premium for the pending-by-email case.
 * That responsibility belongs to /api/auth/link-email which is called by the client
 * after a successful check, using the correct user_id.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GC_BASE_URL, accessEndsAt, latestAppPayments, mapDealColumns } from '@/lib/getcourse'

type ExportResult =
  | { status: 'ready'; items: unknown[][]; fields: string[] }
  | { status: 'failed' }

async function runExport(url: string, apiKey: string): Promise<ExportResult> {
  try {
    const start = await fetch(url)
    const startData = await start.json()
    if (!startData?.success || !startData?.info?.export_id) {
      console.warn('[check-subscription] export start failed:', startData?.error_code, startData?.error_message)
      return { status: 'failed' }
    }

    const exportId = startData.info.export_id
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000))
      const res = await fetch(`${GC_BASE_URL}/exports/${exportId}?key=${apiKey}`)
      const data = await res.json()
      if (data?.success && data?.info?.items) {
        return { status: 'ready', items: data.info.items as unknown[][], fields: (data.info.fields as string[]) ?? [] }
      }
    }
    console.warn('[check-subscription] export not ready in time:', exportId)
  } catch (e) {
    console.warn('[check-subscription] export error:', String(e))
  }
  return { status: 'failed' }
}

type GcVerdict =
  | { status: 'active'; expiresAt: number; dealId: string | null }
  | { status: 'none' }
  | { status: 'unknown' }

async function askGetCourse(email: string, apiKey: string): Promise<GcVerdict> {
  const userExport = await runExport(`${GC_BASE_URL}/users?key=${apiKey}&email=${encodeURIComponent(email)}`, apiKey)
  if (userExport.status !== 'ready') return { status: 'unknown' }

  // Items are arrays: [0] = GC user id. A missing user comes back as id -1.
  const gcUserId = userExport.items
    .map((row) => String(row?.[0] ?? ''))
    .find((id) => id && id !== '-1')
  if (!gcUserId) return { status: 'none' }

  const dealsExport = await runExport(`${GC_BASE_URL}/deals?key=${apiKey}&user_id=${gcUserId}&status=payed`, apiKey)
  if (dealsExport.status !== 'ready') return { status: 'unknown' }
  if (!dealsExport.items.length) return { status: 'none' }

  const cols = mapDealColumns(dealsExport.fields)
  if (!cols) {
    console.error('[check-subscription] deals column mapping failed:', JSON.stringify(dealsExport.fields))
    return { status: 'unknown' }
  }

  // One GC user, so every row carries the same email — take the latest payment overall.
  let latest: { ts: number; dealId: string | null } | null = null
  latestAppPayments(dealsExport.items, cols).forEach((p) => {
    if (!latest || p.ts > latest.ts) latest = p
  })
  if (!latest) return { status: 'none' }

  const { ts, dealId } = latest as { ts: number; dealId: string | null }
  const expiresAt = accessEndsAt(ts)
  return expiresAt > Date.now() ? { status: 'active', expiresAt, dealId } : { status: 'none' }
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
        return NextResponse.json({ hasSubscription: true, status: 'active', expiresAt: cached.expires_at, cached: true })
      }

      // Cache expired — will re-check via GetCourse API below
      console.log('[check-subscription] Cache expired for:', normalizedEmail)
    }

    // 2. Ask GetCourse
    const verdict = await askGetCourse(normalizedEmail, apiKey)
    console.log('[check-subscription] GC verdict:', normalizedEmail, JSON.stringify(verdict))

    if (verdict.status === 'unknown') {
      // Leave everything as it is — a busy GC is not evidence of a lapsed subscription.
      return NextResponse.json({ hasSubscription: false, status: 'unknown' }, { status: 503 })
    }

    // 3. Find the REAL user — prefer telegram_id (TG), fallback to email (web)
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

    // 4. Confirmed payment — update real user and cache subscription
    if (verdict.status === 'active') {
      const expiresAt = new Date(verdict.expiresAt).toISOString()

      if (realUser) {
        // Update the real user's premium status and email
        const { error: userErr } = await supabase
          .from('users')
          .update({ is_premium: true, email: normalizedEmail, verified_email: normalizedEmail })
          .eq('id', realUser.id)
        if (userErr) console.error('[check-subscription] Failed to update user premium:', userErr.message)

        // Never shorten access someone already has (e.g. a manual grant).
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('expires_at')
          .eq('user_id', realUser.id)
          .maybeSingle()
        const keepExisting = !!existing?.expires_at && Date.parse(existing.expires_at) > verdict.expiresAt

        // Upsert subscription for this user (user_id has a unique index)
        const { error: subErr } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: realUser.id,
              email: normalizedEmail,
              status: 'active',
              ...(verdict.dealId ? { gc_deal_id: verdict.dealId } : {}),
              expires_at: keepExisting ? existing!.expires_at : expiresAt,
              updated_at: new Date().toISOString(),
              ...(realUser.telegram_id ? { telegram_id: realUser.telegram_id } : {}),
              ...(realUser.username ? { tg_username: realUser.username } : {}),
            },
            { onConflict: 'user_id' }
          )
        if (subErr) console.error('[check-subscription] Failed to upsert subscription:', subErr.message)

        // Clean up any email-only duplicate user (no telegram_id)
        if (realUser.telegram_id) {
          await supabase
            .from('users')
            .delete()
            .eq('email', normalizedEmail)
            .is('telegram_id', null)
            .neq('id', realUser.id)
        }

        console.log('[check-subscription] Updated real user:', realUser.id, 'is_premium=true until', expiresAt)
      } else {
        // No user found yet (e.g. paid on the website before registering in the
        // Telegram app) — store a PENDING subscription keyed by email only, so
        // /api/auth/link-email can activate it once the user links this email.
        //
        // NOTE: cannot use upsert({ onConflict: 'email' }) here — the unique index
        // on email is PARTIAL (WHERE user_id IS NULL), and ON CONFLICT cannot infer
        // a partial index, so it silently errors and nothing gets written.
        // Do an explicit select → insert/update instead.
        const pendingPayload = {
          email: normalizedEmail,
          status: 'active',
          gc_deal_id: verdict.dealId,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }

        const { data: existingPending } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('email', normalizedEmail)
          .is('user_id', null)
          .maybeSingle()

        const { error: pendingErr } = existingPending
          ? await supabase.from('subscriptions').update(pendingPayload).eq('id', existingPending.id)
          : await supabase.from('subscriptions').insert(pendingPayload)

        if (pendingErr) {
          console.error('[check-subscription] Failed to cache pending subscription:', pendingErr.message)
        } else {
          console.log('[check-subscription] No user found, cached pending subscription by email only')
        }
      }

      return NextResponse.json({ hasSubscription: true, status: 'active', expiresAt })
    }

    // 5. GC answered and confirmed no covering payment. Expire only a cache that has
    //    itself run out — never cut access that is still inside its paid period.
    if (cached) {
      const { error: expSubErr } = await supabase
        .from('subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('email', normalizedEmail)
      if (expSubErr) console.error('[check-subscription] Failed to expire subscription:', expSubErr.message)

      if (realUser) {
        const { error: expUserErr } = await supabase
          .from('users')
          .update({ is_premium: false })
          .eq('id', realUser.id)
        if (expUserErr) console.error('[check-subscription] Failed to clear user premium:', expUserErr.message)
      }

      console.log('[check-subscription] Subscription expired for:', normalizedEmail)
    }

    return NextResponse.json({ hasSubscription: false, status: 'none' })
  } catch (error) {
    console.error('[check-subscription] error:', error)
    return NextResponse.json({ hasSubscription: false, status: 'unknown', error: 'Internal error' }, { status: 500 })
  }
}
