/**
 * Cleanup utility for test users created by test-user-factory.
 *
 * Works as both an importable module and a standalone CLI script:
 *   npx tsx tests/helpers/test-user-cleanup.ts            # dry-run (default)
 *   npx tsx tests/helpers/test-user-cleanup.ts --run       # real delete
 *   npx tsx tests/helpers/test-user-cleanup.ts --run-id=abc123
 *   npx tsx tests/helpers/test-user-cleanup.ts --older-than=24h
 *
 * SAFETY: a user is only deleted when at least 2 of 3 markers match.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  TEST_EMAIL_DOMAIN,
  TEST_TELEGRAM_ID_MIN,
  TEST_TELEGRAM_ID_MAX,
  isTestEmail,
  isTestTelegramId,
  isTestUsername,
} from './test-user-factory'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CleanupOptions {
  /** When true (default) — only list users, don't delete */
  dryRun?: boolean
  /** Delete only users from a specific test run */
  runId?: string
  /** Delete only users older than this duration (e.g. "24h", "2h", "30m") */
  olderThan?: string
}

interface CleanupResult {
  found: number
  deleted: number
  skipped: number
  warnings: string[]
}

interface UserRow {
  id: string
  email: string | null
  username: string | null
  telegram_id: number | null
  supabase_user_id: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      '[test-user-cleanup] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Parse a duration string like "24h", "2h", "30m" into milliseconds.
 */
function parseDuration(str: string): number {
  const match = str.match(/^(\d+)(h|m)$/)
  if (!match) throw new Error(`Invalid duration format: "${str}". Use e.g. "24h" or "30m".`)
  const value = parseInt(match[1], 10)
  const unit = match[2]
  return unit === 'h' ? value * 60 * 60 * 1000 : value * 60 * 1000
}

/**
 * Safety check: at least 2 of 3 test-user criteria must match.
 * Returns { safe: true } or { safe: false, reason: string }.
 */
function isSafeToDelete(user: UserRow): { safe: boolean; reason?: string } {
  let matchCount = 0
  const matched: string[] = []
  const unmatched: string[] = []

  // Criterion 1: email
  if (user.email && isTestEmail(user.email)) {
    matchCount++
    matched.push('email')
  } else {
    unmatched.push('email')
  }

  // Criterion 2: username
  if (user.username && isTestUsername(user.username)) {
    matchCount++
    matched.push('username')
  } else {
    unmatched.push('username')
  }

  // Criterion 3: telegram_id in range OR null (null is acceptable — email-only users)
  if (user.telegram_id === null || isTestTelegramId(user.telegram_id)) {
    matchCount++
    matched.push('telegram_id')
  } else {
    unmatched.push('telegram_id')
  }

  if (matchCount >= 2) {
    return { safe: true }
  }

  return {
    safe: false,
    reason: `Only ${matchCount}/3 criteria matched (${matched.join(', ') || 'none'}). `
      + `Unmatched: ${unmatched.join(', ')}. User id=${user.id}`,
  }
}

// ---------------------------------------------------------------------------
// Core cleanup
// ---------------------------------------------------------------------------

export async function cleanupTestUsers(
  options: CleanupOptions = {},
): Promise<CleanupResult> {
  const { dryRun = true, runId, olderThan } = options
  const supabase = createAdminClient()

  const result: CleanupResult = { found: 0, deleted: 0, skipped: 0, warnings: [] }

  // ---- 1. Find candidate test users ----------------------------------------
  // Use OR conditions: email domain, username prefix, telegram_id range
  let query = supabase
    .from('users')
    .select('id, email, username, telegram_id, supabase_user_id, created_at')
    .or(
      `email.ilike.%@${TEST_EMAIL_DOMAIN},`
      + `username.like.autotest__%,`
      + `and(telegram_id.gte.${TEST_TELEGRAM_ID_MIN},telegram_id.lte.${TEST_TELEGRAM_ID_MAX})`,
    )

  const { data: candidates, error: fetchError } = await query

  if (fetchError) {
    throw new Error(`[test-user-cleanup] Failed to query users: ${fetchError.message}`)
  }

  if (!candidates || candidates.length === 0) {
    console.log('[test-user-cleanup] No test users found.')
    return result
  }

  result.found = candidates.length
  console.log(`[test-user-cleanup] Found ${candidates.length} candidate(s).`)

  // ---- 2. Filter by runId if specified -------------------------------------
  let usersToProcess = candidates as UserRow[]

  if (runId) {
    usersToProcess = usersToProcess.filter(
      (u) => u.username && u.username.includes(`__${runId}__`),
    )
    console.log(`[test-user-cleanup] Filtered to ${usersToProcess.length} user(s) for run "${runId}".`)
  }

  // ---- 3. Filter by olderThan if specified ---------------------------------
  if (olderThan) {
    const maxAge = parseDuration(olderThan)
    const cutoff = Date.now() - maxAge
    usersToProcess = usersToProcess.filter(
      (u) => new Date(u.created_at).getTime() < cutoff,
    )
    console.log(`[test-user-cleanup] Filtered to ${usersToProcess.length} user(s) older than ${olderThan}.`)
  }

  // ---- 4. Process each user ------------------------------------------------
  for (const user of usersToProcess) {
    const label = `id=${user.id} email=${user.email ?? '—'} username=${user.username ?? '—'} tg=${user.telegram_id ?? '—'}`

    // Safety check: at least 2/3 criteria
    const safety = isSafeToDelete(user)
    if (!safety.safe) {
      const warning = `WARNING: Skipping user — ${safety.reason}`
      console.warn(`[test-user-cleanup] ${warning}`)
      result.warnings.push(warning)
      result.skipped++
      continue
    }

    if (dryRun) {
      console.log(`[test-user-cleanup] [DRY-RUN] Would delete: ${label}`)
      result.deleted++
      continue
    }

    // ---- Delete dependent rows (foreign keys) ----

    // user_practices
    const { error: e1 } = await supabase
      .from('user_practices')
      .delete()
      .eq('user_id', user.id)
    if (e1) console.warn(`[test-user-cleanup] Failed to delete user_practices for ${user.id}: ${e1.message}`)

    // favorites
    const { error: e2 } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
    if (e2) console.warn(`[test-user-cleanup] Failed to delete favorites for ${user.id}: ${e2.message}`)

    // user_stats
    const { error: e3 } = await supabase
      .from('user_stats')
      .delete()
      .eq('user_id', user.id)
    if (e3) console.warn(`[test-user-cleanup] Failed to delete user_stats for ${user.id}: ${e3.message}`)

    // ---- Delete the user row ----
    const { error: delError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id)

    if (delError) {
      const warning = `WARNING: Failed to delete user ${user.id}: ${delError.message}`
      console.warn(`[test-user-cleanup] ${warning}`)
      result.warnings.push(warning)
      result.skipped++
      continue
    }

    // ---- Delete from auth.users if supabase_user_id exists ----
    if (user.supabase_user_id) {
      const { error: authError } = await supabase.auth.admin.deleteUser(
        user.supabase_user_id,
      )
      if (authError) {
        console.warn(
          `[test-user-cleanup] auth.users delete failed for ${user.supabase_user_id}: ${authError.message}`,
        )
      }
    }

    console.log(`[test-user-cleanup] Deleted: ${label}`)
    result.deleted++
  }

  // ---- 5. Summary ----------------------------------------------------------
  console.log(
    `[test-user-cleanup] Done. `
    + `Found: ${result.found}, Deleted: ${result.deleted}, `
    + `Skipped: ${result.skipped}, Warnings: ${result.warnings.length}`,
  )

  return result
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isCLI =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].includes('test-user-cleanup')

if (isCLI) {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--run')
  const runIdArg = args.find((a) => a.startsWith('--run-id='))
  const olderThanArg = args.find((a) => a.startsWith('--older-than='))

  const opts: CleanupOptions = {
    dryRun,
    runId: runIdArg ? runIdArg.split('=')[1] : undefined,
    olderThan: olderThanArg ? olderThanArg.split('=')[1] : undefined,
  }

  if (dryRun) {
    console.log('[test-user-cleanup] Running in DRY-RUN mode. Use --run to actually delete.')
  }

  cleanupTestUsers(opts)
    .then((r) => {
      if (r.warnings.length > 0) process.exit(1)
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
