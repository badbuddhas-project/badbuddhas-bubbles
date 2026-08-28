/**
 * GET /api/cron/reconcile-subscriptions — self-healing sync of app access with GetCourse.
 *
 * WHY THIS EXISTS
 * GetCourse has NO outgoing webhook configured that tells our app about payments
 * (verified: no GC process posts to /api/webhooks/getcourse). App access is granted
 * only via the "pull" path (/api/getcourse/check-subscription), which fires when a
 * user manually types their payment email during onboarding. That does NOT cover:
 *   - autopayment renewals (the user never re-enters their email) → they get locked out
 *   - buyers who never completed the email step
 * This cron closes that gap: it reconciles subscriptions that are about to lapse (or
 * just lapsed) against GetCourse and extends access when GC confirms a recent payment
 * for the app product.
 *
 * WHY TWO-PHASE
 * GetCourse exports are asynchronous and take minutes to generate — far longer than a
 * serverless function may run. So we never poll inline. Instead each run:
 *   PHASE A: if a previous run left a pending export id that is now READY, fetch and
 *            reconcile it, then clear it. If it is still generating, wait (return) and
 *            try again next run. If it is gone/expired, drop it.
 *   PHASE B: start a fresh bulk paid-deals export and store its id for the next run.
 * State lives in public.reconcile_state (single row, id=1). With a daily cron the
 * effective latency is ~24h; two manual runs a few minutes apart reconcile immediately.
 *
 * SAFETY MODEL
 * - EXTEND-ONLY. Never sets is_premium=false, never shortens expires_at. Revocation
 *   stays owned by check-subscription / telegram-sync. Worst case here is a no-op.
 * - Uses the LATEST paid deal's DATE (paid deals stay "payed" in GC forever), filtered
 *   to the app product. New expiry = latestPaidDate + 30d; only written when later than
 *   what we have AND still in the future.
 * - DRY-RUN by default until RECONCILE_LIVE=1 (or ?live=1): reports intended changes
 *   without writing.
 *
 * AUTH: Authorization: Bearer <CRON_SECRET>, same as the other crons.
 */

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BASE_URL = 'https://online.badbuddhas.ru/pl/api/account'

// Re-check window (days) around now for candidate subscriptions.
const LOOKBACK_DAYS = 14
const LOOKAHEAD_DAYS = 2
// Date window for the bulk paid-deals export (covers recent renewals).
const EXPORT_WINDOW_DAYS = 25
// One app subscription period.
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000

// Matches the app-subscription product in a GC deal's "Состав заказа" column.
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

type ExportResult =
  | { status: 'ready'; items: unknown[][]; fields: string[] }
  | { status: 'pending' }
  | { status: 'gone' }

/** Single (non-polling) fetch of an export by id. GC error_code 909 = not generated yet. */
async function fetchExport(id: string, apiKey: string): Promise<ExportResult> {
  try {
    const res = await fetch(`${BASE_URL}/exports/${id}?key=${apiKey}`)
    const data = await res.json()
    if (data?.success && data?.info?.items) {
      return { status: 'ready', items: data.info.items as unknown[][], fields: (data.info.fields as string[]) ?? [] }
    }
    if (data?.error_code === 909) return { status: 'pending' }
    return { status: 'gone' }
  } catch {
    // transient network error — treat as not-ready so we retry next run
    return { status: 'pending' }
  }
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
  email: string
  currentExpiry: string | null
  newExpiry: string
  dealId: string | null
  paidAt: string
}

/** Reconcile candidate subscriptions against a ready GC paid-deals export. */
async function processExport(
  items: unknown[][],
  fields: string[],
  supabase: SupabaseClient,
  dryRun: boolean,
  now: number,
) {
  const emailCol = findCol(fields, [/^email$/i, /e-?mail/i])
  const payCol = findCol(fields, [/дата\s*оплат/i, /дата\s*заверш/i, /date_payment$/i, /payed|paid/i])
  const prodCol = findCol(fields, [/состав\s*заказ/i, /предложени/i, /продукт/i, /состав/i, /offer|product/i])
  const idCol = findCol(fields, [/id\s*заказа/i, /^id$/i, /deal/i, /номер/i])

  if (emailCol < 0 || payCol < 0 || prodCol < 0) {
    console.error(`[reconcile] column mapping failed emailCol=${emailCol} payCol=${payCol} prodCol=${prodCol} fields=${JSON.stringify(fields)}`)
    return { error: 'column-mapping', rows: items.length }
  }

  // email -> latest app-product paid deal
  const latest = new Map<string, { ts: number; dealId: string | null }>()
  for (const row of items) {
    if (!APP_PRODUCT_RE.test(String(row[prodCol] ?? ''))) continue
    const email = String(row[emailCol] ?? '').toLowerCase().trim()
    if (!email) continue
    const ts = parseDate(row[payCol])
    if (ts == null) continue
    const prev = latest.get(email)
    if (!prev || ts > prev.ts) {
      latest.set(email, { ts, dealId: idCol >= 0 && row[idCol] != null ? String(row[idCol]) : null })
    }
  }

  const lookback = new Date(now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const lookahead = new Date(now + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: subs, error: subsErr } = await supabase
    .from('subscriptions')
    .select('id, user_id, telegram_id, email, status, expires_at')
    .not('user_id', 'is', null)
    .not('email', 'is', null)
    .gte('expires_at', lookback)
    .lte('expires_at', lookahead)
    .order('expires_at', { ascending: true })

  if (subsErr) {
    console.error('[reconcile] candidate query error:', subsErr.message)
    return { error: 'db', rows: items.length }
  }

  const intended: Intended[] = []
  let extended = 0

  for (const sub of subs ?? []) {
    const email = String(sub.email).toLowerCase().trim()
    const m = latest.get(email)
    if (!m) continue

    const newExpiryTs = m.ts + PERIOD_MS
    const currentTs = sub.expires_at ? Date.parse(sub.expires_at) : 0
    // Extend-only: write only when GC says they are paid further than we think and it is future.
    if (newExpiryTs <= currentTs || newExpiryTs <= now) continue

    const rec: Intended = {
      email,
      currentExpiry: sub.expires_at,
      newExpiry: new Date(newExpiryTs).toISOString(),
      dealId: m.dealId,
      paidAt: new Date(m.ts).toISOString(),
    }
    intended.push(rec)

    if (!dryRun) {
      const { error: subErr } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          expires_at: rec.newExpiry,
          ...(m.dealId ? { gc_deal_id: m.dealId } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id)
      if (subErr) {
        console.error('[reconcile] sub update failed for', email, subErr.message)
        continue
      }
      const { error: userErr } = await supabase
        .from('users')
        .update({ is_premium: true })
        .eq('id', sub.user_id)
      if (userErr) {
        console.error('[reconcile] user update failed for', email, userErr.message)
        continue
      }
      extended++
      console.log(`[reconcile] extended ${email} -> ${rec.newExpiry} (paid ${rec.paidAt}, deal ${rec.dealId})`)
    }
  }

  return {
    exportRows: items.length,
    appPayers: latest.size,
    candidates: subs?.length ?? 0,
    matched: intended.length,
    extended: dryRun ? 0 : extended,
    intended: dryRun ? intended : undefined,
  }
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

  const { data: state, error: stateErr } = await supabase
    .from('reconcile_state')
    .select('pending_export_id, started_at')
    .eq('id', 1)
    .maybeSingle()
  console.log(`[reconcile] state read=${JSON.stringify(state)} err=${stateErr?.message ?? ''} code=${stateErr?.code ?? ''}`)

  let phase = 'idle'
  let result: Awaited<ReturnType<typeof processExport>> | null = null

  // PHASE A — consume a previously started export if it is ready.
  if (state?.pending_export_id) {
    const r = await fetchExport(state.pending_export_id, apiKey)
    if (r.status === 'ready') {
      result = await processExport(r.items, r.fields, supabase, dryRun, now)
      await supabase.from('reconcile_state').update({ pending_export_id: null, updated_at: new Date().toISOString() }).eq('id', 1)
      phase = 'processed'
    } else if (r.status === 'pending') {
      // still generating — leave it, retry next run, do not start a duplicate
      return NextResponse.json({ mode: dryRun ? 'dry-run' : 'live', phase: 'waiting', pendingExportId: state.pending_export_id, startedAt: state.started_at })
    } else {
      phase = 'dropped-stale'
    }
  }

  // PHASE B — start a fresh export for the next run.
  const fromDate = new Date(now - EXPORT_WINDOW_DAYS * 864e5).toISOString().slice(0, 10)
  const freshId = await startExport(`${BASE_URL}/deals?key=${apiKey}&status=payed&created_at[from]=${fromDate}`)
  await supabase
    .from('reconcile_state')
    .update({ pending_export_id: freshId, started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', 1)

  const summary = { mode: dryRun ? 'dry-run' : 'live', phase, startedExportId: freshId, exportFrom: fromDate, result }
  console.log('[reconcile] summary', JSON.stringify({ ...summary, result: result ? { ...result, intended: undefined } : null }))
  return NextResponse.json(summary)
}
