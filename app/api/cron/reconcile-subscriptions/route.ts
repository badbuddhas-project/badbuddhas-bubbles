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
 * This cron closes that gap. It runs two reconciliations against the same GC export:
 *   1. RENEWALS — subscriptions about to lapse (or just lapsed) get extended when GC
 *      confirms a recent payment for the app product.
 *   2. MISSING ROWS — a payer who has NO subscription row linked to them at all gets
 *      one created. This happens when someone registers in the app within minutes of
 *      paying: check-subscription runs before GC's export reports the fresh deal, so
 *      nothing is written, the user coasts on their trial and loses access when it
 *      ends (case: s_lebediuk, paid 20.08 15:36, registered 20.08 15:41). An email-only
 *      "pending" row (user_id IS NULL, left by check-subscription) is linked instead of
 *      inserting a duplicate.
 *   3. TRIAL REQUESTS — someone who signed up for the free "14 дней в приложении" offer
 *      in GC but never got a trial in the app, because the app grants one only on
 *      account creation (telegram-sync sets trial_ends_at only while it is null). They
 *      see the 3 free practices and think the trial is broken (case: bbblisful,
 *      requested 26.08, trial had lapsed 05.07). Needs its own export: the trial product
 *      is free, so it never appears in the status=payed one.
 *
 * WHY TWO-PHASE (STATELESS)
 * GetCourse exports are asynchronous and take minutes to generate — far longer than a
 * serverless function may run. GetCourse dedups exports: identical params return the
 * SAME export_id for the rest of the day. So each run just requests the (day-granular)
 * export and tries to fetch it: the day's first run creates it (status pending); a
 * later run the same day gets the same id, now generated, and reconciles it. No stored
 * state needed. Two cron runs ~20min apart per day (see vercel.json) give same-day
 * reconciliation; two manual runs a few minutes apart do the same.
 *
 * SAFETY MODEL
 * - EXTEND-ONLY. Never sets is_premium=false, never shortens expires_at, never grants
 *   access GC has not confirmed a paid app-product deal for. Revocation
 *   stays owned by check-subscription / telegram-sync. Worst case here is a no-op.
 * - Uses the LATEST real app payment's DATE (paid deals stay "payed" in GC forever, and
 *   free deals are "payed" too — see lib/getcourse isAppPayment). New expiry =
 *   latestPaidDate + 30d + renewal grace; only written when later than what we have AND
 *   still in the future.
 * - DRY-RUN by default until RECONCILE_LIVE=1 (or ?live=1): reports intended changes
 *   without writing.
 *
 * AUTH: Authorization: Bearer <CRON_SECRET>, same as the other crons.
 */

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  GC_BASE_URL as BASE_URL,
  APP_PRODUCT_RE,
  TRIAL_PRODUCT_RE,
  accessEndsAt,
  findCol,
  latestAppPayments,
  mapDealColumns,
  parseDate,
  type AppPayment,
} from '@/lib/getcourse'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Re-check window (days) around now for candidate subscriptions.
const LOOKBACK_DAYS = 14
const LOOKAHEAD_DAYS = 2
// Date window for the bulk paid-deals export (covers recent renewals).
const EXPORT_WINDOW_DAYS = 25
// One trial period, matching what register/telegram-sync hand out.
const TRIAL_MS = 14 * 24 * 60 * 60 * 1000

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

type Intended = {
  email: string
  currentExpiry: string | null
  newExpiry: string
  dealId: string | null
  paidAt: string
}

type IntendedNew = {
  email: string
  userId: string
  telegramId: number | null
  newExpiry: string
  dealId: string | null
  paidAt: string
  /** 'insert' = no row at all; 'link' = adopting an email-only pending row. */
  via: 'insert' | 'link'
}

/**
 * `.in()` builds a GET query string, so a few hundred emails would blow past URL length
 * limits. Query in chunks and concatenate. Also keeps every response well under
 * PostgREST's 1000-row page cap.
 */
async function selectIn<T>(
  supabase: SupabaseClient,
  table: string,
  cols: string,
  column: string,
  values: string[],
  extra?: (q: any) => any,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const out: T[] = []
  for (let i = 0; i < values.length; i += 150) {
    let q = supabase.from(table).select(cols).in(column, values.slice(i, i + 150))
    if (extra) q = extra(q)
    const { data, error } = await q
    if (error) return { data: null, error }
    out.push(...((data ?? []) as T[]))
  }
  return { data: out, error: null }
}

/** Dedupe rows by id, keeping the first occurrence. */
function byId<T extends { id: string }>(rows: T[]): T[] {
  const seen: Record<string, true> = {}
  const out: T[] = []
  for (const r of rows) {
    if (seen[r.id]) continue
    seen[r.id] = true
    out.push(r)
  }
  return out
}

/**
 * Second reconciliation pass: confirmed payers who have NO subscription row linked to
 * them. Bounded by the export's payer list (tens of emails), so it costs a handful of
 * queries regardless of how large `users` grows.
 */
async function processMissingRows(
  latest: Map<string, AppPayment>,
  supabase: SupabaseClient,
  dryRun: boolean,
  now: number,
) {
  // Only payers whose paid period still covers today can gain anything here.
  const emails: string[] = []
  latest.forEach((m, email) => {
    if (accessEndsAt(m.ts) > now) emails.push(email)
  })
  if (!emails.length) return { payersInPeriod: 0, matched: 0, created: 0, intendedNew: undefined as IntendedNew[] | undefined }

  const cols = 'id, telegram_id, username, email, verified_email'
  type UserRow = { id: string; telegram_id: number | null; username: string | null; email: string | null; verified_email: string | null }
  const [byVerified, byEmail] = await Promise.all([
    selectIn<UserRow>(supabase, 'users', cols, 'verified_email', emails),
    selectIn<UserRow>(supabase, 'users', cols, 'email', emails),
  ])
  if (byVerified.error || byEmail.error) {
    console.error('[reconcile] missing-rows user query error:', byVerified.error?.message ?? byEmail.error?.message)
    return { error: 'db-users' as const, payersInPeriod: emails.length, matched: 0, created: 0 }
  }

  const users = byId([...(byVerified.data ?? []), ...(byEmail.data ?? [])])
  if (!users.length) return { payersInPeriod: emails.length, matched: 0, created: 0, intendedNew: undefined }

  // Which of them already have a subscription row, and which pending (user_id IS NULL)
  // rows exist for these emails — those get adopted rather than duplicated.
  const [linked, pending] = await Promise.all([
    selectIn<{ user_id: string }>(supabase, 'subscriptions', 'user_id', 'user_id', users.map((u) => u.id)),
    selectIn<{ id: string; email: string | null }>(supabase, 'subscriptions', 'id, email', 'email', emails, (q) => q.is('user_id', null)),
  ])
  if (linked.error || pending.error) {
    console.error('[reconcile] missing-rows subs query error:', linked.error?.message ?? pending.error?.message)
    return { error: 'db-subs' as const, payersInPeriod: emails.length, matched: 0, created: 0 }
  }

  const hasSub = new Set((linked.data ?? []).map((s) => s.user_id as string))
  const pendingByEmail = new Map<string, string>()
  for (const p of pending.data ?? []) {
    const e = String(p.email ?? '').toLowerCase().trim()
    if (e && !pendingByEmail.has(e)) pendingByEmail.set(e, p.id as string)
  }

  const intendedNew: IntendedNew[] = []
  let created = 0

  for (const user of users) {
    if (hasSub.has(user.id)) continue

    // The email GC confirmed payment for — verified_email wins, it is the payment email.
    const email = [user.verified_email, user.email]
      .map((e) => String(e ?? '').toLowerCase().trim())
      .find((e) => e && latest.has(e))
    if (!email) continue

    const m = latest.get(email)!
    const newExpiryTs = accessEndsAt(m.ts)
    if (newExpiryTs <= now) continue

    const pendingId = pendingByEmail.get(email) ?? null
    const rec: IntendedNew = {
      email,
      userId: user.id,
      telegramId: (user.telegram_id as number | null) ?? null,
      newExpiry: new Date(newExpiryTs).toISOString(),
      dealId: m.dealId,
      paidAt: new Date(m.ts).toISOString(),
      via: pendingId ? 'link' : 'insert',
    }
    intendedNew.push(rec)
    if (dryRun) continue

    const payload = {
      user_id: user.id,
      email,
      status: 'active',
      expires_at: rec.newExpiry,
      ...(m.dealId ? { gc_deal_id: m.dealId } : {}),
      ...(user.telegram_id ? { telegram_id: user.telegram_id } : {}),
      ...(user.username ? { tg_username: user.username } : {}),
      updated_at: new Date().toISOString(),
    }

    const { error: writeErr } = pendingId
      ? await supabase.from('subscriptions').update(payload).eq('id', pendingId)
      : await supabase.from('subscriptions').insert(payload)
    if (writeErr) {
      console.error(`[reconcile] missing-row ${rec.via} failed for`, email, writeErr.message)
      continue
    }

    const { error: userErr } = await supabase.from('users').update({ is_premium: true }).eq('id', user.id)
    if (userErr) {
      console.error('[reconcile] missing-row user update failed for', email, userErr.message)
      continue
    }
    created++
    console.log(`[reconcile] ${rec.via}ed subscription for ${email} -> ${rec.newExpiry} (paid ${rec.paidAt}, deal ${rec.dealId})`)
  }

  return {
    payersInPeriod: emails.length,
    matched: intendedNew.length,
    created: dryRun ? 0 : created,
    intendedNew: dryRun ? intendedNew : undefined,
  }
}

/** Reconcile candidate subscriptions against a ready GC paid-deals export. */
async function processExport(
  items: unknown[][],
  fields: string[],
  supabase: SupabaseClient,
  dryRun: boolean,
  now: number,
) {
  const cols = mapDealColumns(fields)
  if (!cols) {
    console.error(`[reconcile] column mapping failed fields=${JSON.stringify(fields)}`)
    return { error: 'column-mapping', rows: items.length }
  }

  // email -> latest real app payment (free "payed" deals and the trial excluded)
  const latest = latestAppPayments(items, cols)

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

    const newExpiryTs = accessEndsAt(m.ts)
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

  const missingRows = await processMissingRows(latest, supabase, dryRun, now)

  return {
    exportRows: items.length,
    appPayers: latest.size,
    candidates: subs?.length ?? 0,
    matched: intended.length,
    extended: dryRun ? 0 : extended,
    intended: dryRun ? intended : undefined,
    missingRows,
  }
}

type IntendedTrial = {
  email: string
  userId: string
  telegramId: number | null
  requestedAt: string
  currentTrialEnds: string | null
  newTrialEnds: string
}

/**
 * Third reconciliation pass: people who asked for the 14-day trial in GetCourse but
 * never got it in the app.
 *
 * The app hands out a trial exactly once per account (telegram-sync only sets
 * trial_ends_at when it is still null), and GC never tells us about the request. So
 * someone who registered months ago, let their trial lapse, and then signed up for the
 * trial offer sees only the 3 free practices and assumes the trial is broken
 * (case: bbblisful, requested 26.08, trial had lapsed 05.07).
 *
 * The trial is counted from the REQUEST date, so a request whose 14 days have already
 * elapsed grants nothing — the daily cron catches fresh ones within a day. Extend-only:
 * never shortens an existing trial, never touches anyone with paid access.
 */
async function processTrialRequests(
  items: unknown[][],
  fields: string[],
  supabase: SupabaseClient,
  dryRun: boolean,
  now: number,
) {
  const emailCol = findCol(fields, [/^email$/i, /e-?mail/i])
  const createdCol = findCol(fields, [/дата\s*создан/i, /date_create/i, /created/i])
  const prodCol = findCol(fields, [/состав\s*заказ/i, /предложени/i, /продукт/i, /состав/i, /offer|product/i])

  if (emailCol < 0 || createdCol < 0 || prodCol < 0) {
    console.error(`[reconcile] trial column mapping failed emailCol=${emailCol} createdCol=${createdCol} prodCol=${prodCol}`)
    return { error: 'column-mapping' as const, rows: items.length }
  }

  // email -> latest trial request that could still be worth honouring
  const requests = new Map<string, number>()
  for (const row of items) {
    const product = String(row[prodCol] ?? '')
    if (!TRIAL_PRODUCT_RE.test(product) || !APP_PRODUCT_RE.test(product)) continue
    const email = String(row[emailCol] ?? '').toLowerCase().trim()
    if (!email) continue
    const ts = parseDate(row[createdCol])
    if (ts == null || ts + TRIAL_MS <= now) continue
    const prev = requests.get(email)
    if (prev == null || ts > prev) requests.set(email, ts)
  }

  const emails: string[] = []
  requests.forEach((_ts, email) => emails.push(email))
  if (!emails.length) return { requestsInWindow: 0, matched: 0, granted: 0, intendedTrials: undefined as IntendedTrial[] | undefined }

  const cols = 'id, telegram_id, email, verified_email, is_premium, trial_ends_at'
  type TrialUserRow = { id: string; telegram_id: number | null; email: string | null; verified_email: string | null; is_premium: boolean | null; trial_ends_at: string | null }
  const [byVerified, byEmail] = await Promise.all([
    selectIn<TrialUserRow>(supabase, 'users', cols, 'verified_email', emails),
    selectIn<TrialUserRow>(supabase, 'users', cols, 'email', emails),
  ])
  if (byVerified.error || byEmail.error) {
    console.error('[reconcile] trial user query error:', byVerified.error?.message ?? byEmail.error?.message)
    return { error: 'db-users' as const, requestsInWindow: emails.length, matched: 0, granted: 0 }
  }

  const users = byId([...(byVerified.data ?? []), ...(byEmail.data ?? [])])
  if (!users.length) return { requestsInWindow: emails.length, matched: 0, granted: 0, intendedTrials: undefined }

  // Anyone with a live paid subscription needs no trial.
  const { data: paidSubs, error: subsErr } = await selectIn<{ user_id: string; status: string; expires_at: string | null }>(
    supabase,
    'subscriptions',
    'user_id, status, expires_at',
    'user_id',
    users.map((u) => u.id),
    (q) => q.eq('status', 'active'),
  )
  if (subsErr) {
    console.error('[reconcile] trial subs query error:', subsErr.message)
    return { error: 'db-subs' as const, requestsInWindow: emails.length, matched: 0, granted: 0 }
  }
  const paidUserIds = new Set(
    (paidSubs ?? [])
      .filter((s) => s.expires_at && Date.parse(s.expires_at as string) > now)
      .map((s) => s.user_id as string),
  )

  const intendedTrials: IntendedTrial[] = []
  let granted = 0

  for (const user of users) {
    if (user.is_premium || paidUserIds.has(user.id)) continue

    const email = [user.verified_email, user.email]
      .map((e) => String(e ?? '').toLowerCase().trim())
      .find((e) => e && requests.has(e))
    if (!email) continue

    const requestedTs = requests.get(email)!
    const currentTs = user.trial_ends_at ? Date.parse(user.trial_ends_at as string) : 0
    // The bug this pass fixes is "their trial had already lapsed when they asked".
    // If the trial was still running at request time they DID get their 14 days — the
    // usual case, since the app grants a trial on the same visit that creates the GC
    // deal. Comparing end dates instead would fire on all of them for the few minutes
    // between registration and the deal.
    if (currentTs >= requestedTs) continue

    const newTrialTs = requestedTs + TRIAL_MS
    if (newTrialTs <= currentTs) continue

    const rec: IntendedTrial = {
      email,
      userId: user.id,
      telegramId: (user.telegram_id as number | null) ?? null,
      requestedAt: new Date(requestedTs).toISOString(),
      currentTrialEnds: (user.trial_ends_at as string | null) ?? null,
      newTrialEnds: new Date(newTrialTs).toISOString(),
    }
    intendedTrials.push(rec)
    if (dryRun) continue

    const { error: updErr } = await supabase
      .from('users')
      .update({ trial_ends_at: rec.newTrialEnds })
      .eq('id', user.id)
    if (updErr) {
      console.error('[reconcile] trial grant failed for', email, updErr.message)
      continue
    }
    granted++
    console.log(`[reconcile] granted trial to ${email} -> ${rec.newTrialEnds} (requested ${rec.requestedAt})`)
  }

  return {
    requestsInWindow: emails.length,
    matched: intendedTrials.length,
    granted: dryRun ? 0 : granted,
    intendedTrials: dryRun ? intendedTrials : undefined,
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

  // STATELESS two-phase via GetCourse's export dedup: identical export params return
  // the SAME export_id for the rest of the day, so we need no stored state. The day's
  // first cron run creates the export (status=pending); a later run the same day gets
  // the same id, now generated, and processes it. `fromDate` is day-granular so all
  // runs on a given day share one export.
  const fromDate = new Date(now - EXPORT_WINDOW_DAYS * 864e5).toISOString().slice(0, 10)
  const exportId = await startExport(`${BASE_URL}/deals?key=${apiKey}&status=payed&created_at[from]=${fromDate}`)
  if (!exportId) {
    return NextResponse.json({ mode: dryRun ? 'dry-run' : 'live', phase: 'start-failed', exportFrom: fromDate }, { status: 502 })
  }

  const r = await fetchExport(exportId, apiKey)
  let phase: string = r.status // 'pending' | 'gone' | (below) 'processed'
  let result: Awaited<ReturnType<typeof processExport>> | null = null
  if (r.status === 'ready') {
    result = await processExport(r.items, r.fields, supabase, dryRun, now)
    phase = 'processed'
  }

  // Trial requests need their OWN export: the trial product is free, so those deals are
  // never in the status=payed export above. Same day-granular dedup applies.
  const trialExportId = await startExport(`${BASE_URL}/deals?key=${apiKey}&created_at[from]=${fromDate}`)
  let trialPhase = 'start-failed'
  let trialResult: Awaited<ReturnType<typeof processTrialRequests>> | null = null
  if (trialExportId) {
    const tr = await fetchExport(trialExportId, apiKey)
    trialPhase = tr.status
    if (tr.status === 'ready') {
      trialResult = await processTrialRequests(tr.items, tr.fields, supabase, dryRun, now)
      trialPhase = 'processed'
    }
  }

  const summary = {
    mode: dryRun ? 'dry-run' : 'live',
    phase,
    exportId,
    exportFrom: fromDate,
    result,
    trial: { phase: trialPhase, exportId: trialExportId, result: trialResult },
  }
  const compact = result
    ? { ...result, intended: undefined, missingRows: result.missingRows ? { ...result.missingRows, intendedNew: undefined } : undefined }
    : null
  const trialCompact = trialResult ? { ...trialResult, intendedTrials: undefined } : null
  console.log('[reconcile] summary', JSON.stringify({
    ...summary,
    result: compact,
    trial: { ...summary.trial, result: trialCompact },
  }))
  if (dryRun && trialResult?.intendedTrials?.length) {
    console.log('[reconcile] intendedTrials', JSON.stringify(trialResult.intendedTrials))
  }
  if (dryRun && result?.intended?.length) {
    console.log('[reconcile] intended', JSON.stringify(result.intended))
  }
  if (dryRun && result?.missingRows?.intendedNew?.length) {
    console.log('[reconcile] intendedNew', JSON.stringify(result.missingRows.intendedNew))
  }
  return NextResponse.json(summary)
}
