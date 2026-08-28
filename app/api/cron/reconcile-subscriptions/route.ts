/**
 * GET /api/cron/reconcile-subscriptions — self-healing sync of app access with GetCourse.
 *
 * WHY THIS EXISTS
 * GetCourse has NO outgoing webhook configured that tells our app about payments
 * (verified: no process in GC posts to /api/webhooks/getcourse). App access is
 * granted only via the "pull" path (/api/getcourse/check-subscription), which fires
 * when a user manually types the email they paid with during onboarding. That path
 * does NOT cover:
 *   - autopayment renewals (the user never re-enters their email) → they get locked out
 *   - buyers who never completed the email step
 * This cron closes that gap: it periodically re-checks subscriptions that are about to
 * lapse (or just lapsed) against the GetCourse Export API and extends access when GC
 * confirms a recent payment for the app product.
 *
 * SAFETY MODEL
 * - EXTEND-ONLY. This job never sets is_premium=false and never shortens expires_at.
 *   Revocation stays owned by check-subscription / telegram-sync. Worst case here is a
 *   no-op (falls back to today's manual process), never a wrongful lockout.
 * - Uses the LATEST paid deal's DATE (not merely "has a paid deal"), because paid deals
 *   stay "payed" in GC forever. New expiry = latestPaidDate + 30d. Only writes when that
 *   is later than what we already have AND still in the future.
 * - Filters GC deals to the app product (APP_PRODUCT_RE) so an unrelated course purchase
 *   on the same email does not grant app access.
 * - DRY-RUN by default until RECONCILE_LIVE=1 is set (or ?live=1 passed). Dry-run reports
 *   intended changes in the JSON response + logs without writing anything. Validate the
 *   field mapping against real GC data before going live.
 *
 * AUTH: Authorization: Bearer <CRON_SECRET>, same as the other crons.
 */

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BASE_URL = 'https://online.badbuddhas.ru/pl/api/account'

// Subscription window (days) around now to re-check: recently lapsed .. about to lapse.
const LOOKBACK_DAYS = 14
const LOOKAHEAD_DAYS = 2
// Max subscriptions to attempt per run; a wall-clock budget stops us early anyway.
const BATCH = 25
// Stop starting new GC lookups after this many ms (keep headroom under maxDuration).
const TIME_BUDGET_MS = 50_000
// One app subscription period.
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000

// Matches the app-subscription product/offer title in a GC deal row. Keep broad but
// specific to the paid app product (currently "Черный Баблс | Bubles Black | приложение").
const APP_PRODUCT_RE = /bubbles?\s*black|приложени|чёрный\s*баблс|черный\s*баблс|баблс/i

function safeEqual(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Kick off a GC export, return its export_id (or null on failure). */
async function startExport(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data?.success && data?.info?.export_id) return String(data.info.export_id)
  } catch (e) {
    console.error('[reconcile] startExport failed:', String(e))
  }
  return null
}

/** Poll a GC export until it has rows; returns { items, fields } or null. */
async function pollExport(
  exportId: string,
  apiKey: string,
): Promise<{ items: unknown[][]; fields: string[] } | null> {
  for (let i = 0; i < 18; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    try {
      const res = await fetch(`${BASE_URL}/exports/${exportId}?key=${apiKey}`)
      const data = await res.json()
      if (data?.success && data?.info?.items) {
        return {
          items: (data.info.items as unknown[][]) ?? [],
          fields: (data.info.fields as string[]) ?? [],
        }
      }
    } catch {
      // transient — keep polling
    }
  }
  return null
}

/** Find a column index by trying several header-name candidates (case-insensitive). */
function findCol(fields: string[], candidates: RegExp[]): number {
  for (const re of candidates) {
    const idx = fields.findIndex((f) => re.test(f))
    if (idx >= 0) return idx
  }
  return -1
}

function parseDate(raw: unknown): number | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  // GC dates look like "2026-08-27 15:54:00"; treat as Moscow time (UTC+3) if no tz.
  const iso = /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s) && !/[zZ+]/.test(s)
    ? s.replace(' ', 'T') + '+03:00'
    : s
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : t
}

type Intended = {
  subId: string
  email: string
  userId: string
  telegramId: number | null
  currentExpiry: string | null
  newExpiry: string
  dealId: string | null
  paidAt: string
}

export async function GET(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!safeEqual(secret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GETCOURSE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GETCOURSE_API_KEY not configured' }, { status: 500 })
  }

  const url = new URL(request.url)
  const live = url.searchParams.get('live') === '1' || process.env.RECONCILE_LIVE === '1'
  const dryRun = !live

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const now = Date.now()
  const lookback = new Date(now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const lookahead = new Date(now + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Candidates: real users with an email, whose access is about to lapse or just lapsed.
  const { data: subs, error: subsErr } = await supabase
    .from('subscriptions')
    .select('id, user_id, telegram_id, email, status, expires_at')
    .not('user_id', 'is', null)
    .not('email', 'is', null)
    .gte('expires_at', lookback)
    .lte('expires_at', lookahead)
    .order('expires_at', { ascending: true })
    .limit(BATCH)

  if (subsErr) {
    console.error('[reconcile] candidate query error:', subsErr.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const started = Date.now()
  const intended: Intended[] = []
  let checked = 0
  let extended = 0
  let skippedTime = 0

  for (const sub of subs ?? []) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      skippedTime = (subs?.length ?? 0) - checked
      break
    }
    checked++

    const email = String(sub.email).toLowerCase().trim()

    // 1) email -> GC user id
    const userExportId = await startExport(
      `${BASE_URL}/users?key=${apiKey}&email=${encodeURIComponent(email)}`,
    )
    if (!userExportId) continue
    const userExport = await pollExport(userExportId, apiKey)
    const gcUserId = userExport?.items?.[0]?.[0]
    if (!gcUserId) continue

    // 2) GC user id -> paid deals (with field headers so we can locate date/product)
    const dealsExportId = await startExport(
      `${BASE_URL}/deals?key=${apiKey}&user_id=${gcUserId}&status=payed`,
    )
    if (!dealsExportId) continue
    const dealsExport = await pollExport(dealsExportId, apiKey)
    if (!dealsExport || !dealsExport.items.length) continue

    const { items, fields } = dealsExport
    const dateCol = findCol(fields, [
      /дата\s*заверш/i, /дата\s*оплат/i, /completed/i, /payed|paid/i, /дата\s*создан/i, /created/i, /дата/i,
    ])
    const productCol = findCol(fields, [/предложени/i, /продукт/i, /названи/i, /offer|product|title/i])
    const idCol = findCol(fields, [/^id$/i, /номер/i, /deal/i])

    // Keep only rows for the app product (if we can identify the product column).
    const appRows = productCol >= 0
      ? items.filter((row) => APP_PRODUCT_RE.test(String(row[productCol] ?? '')))
      : items

    if (!appRows.length) continue

    // Latest paid app deal by date.
    let bestTs: number | null = null
    let bestRow: unknown[] | null = null
    for (const row of appRows) {
      const ts = dateCol >= 0 ? parseDate(row[dateCol]) : null
      if (ts != null && (bestTs == null || ts > bestTs)) {
        bestTs = ts
        bestRow = row
      }
    }
    // If we could not read a date, we cannot safely compute an expiry — skip (extend-only).
    if (bestTs == null || bestRow == null) {
      console.warn('[reconcile] no readable deal date for', email, 'fields=', JSON.stringify(fields))
      continue
    }

    const newExpiryTs = bestTs + PERIOD_MS
    const currentTs = sub.expires_at ? Date.parse(sub.expires_at) : 0

    // Extend-only: write solely when GC says they are paid further than we think AND
    // that new expiry is still in the future.
    if (newExpiryTs <= currentTs || newExpiryTs <= now) continue

    const dealId = idCol >= 0 && bestRow[idCol] != null ? String(bestRow[idCol]) : null
    const rec: Intended = {
      subId: sub.id,
      email,
      userId: sub.user_id,
      telegramId: sub.telegram_id ?? null,
      currentExpiry: sub.expires_at,
      newExpiry: new Date(newExpiryTs).toISOString(),
      dealId,
      paidAt: new Date(bestTs).toISOString(),
    }
    intended.push(rec)

    if (!dryRun) {
      const { error: subUpdErr } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          expires_at: rec.newExpiry,
          ...(dealId ? { gc_deal_id: dealId } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id)
      if (subUpdErr) {
        console.error('[reconcile] sub update failed for', email, subUpdErr.message)
        continue
      }

      const { error: userUpdErr } = await supabase
        .from('users')
        .update({ is_premium: true })
        .eq('id', sub.user_id)
      if (userUpdErr) {
        console.error('[reconcile] user update failed for', email, userUpdErr.message)
        continue
      }
      extended++
      console.log(`[reconcile] extended ${email} -> ${rec.newExpiry} (paid ${rec.paidAt}, deal ${dealId})`)
    } else {
      console.log(`[reconcile][dry] would extend ${email} -> ${rec.newExpiry} (paid ${rec.paidAt}, deal ${dealId})`)
    }
  }

  const summary = {
    mode: dryRun ? 'dry-run' : 'live',
    candidates: subs?.length ?? 0,
    checked,
    matched: intended.length,
    extended: dryRun ? 0 : extended,
    skippedForTime: skippedTime,
    intended: dryRun ? intended : undefined,
  }
  console.log('[reconcile] summary', JSON.stringify({ ...summary, intended: undefined }))
  return NextResponse.json(summary)
}
