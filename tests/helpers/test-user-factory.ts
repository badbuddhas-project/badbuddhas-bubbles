/**
 * Factory for creating uniquely-marked test users.
 *
 * Every test user is identifiable by:
 *   - email domain: @badbuddhas.test
 *   - telegram_id range: 9999000001–9999999999
 *   - username prefix: autotest__
 *
 * Real users NEVER match these criteria, so cleanup is safe.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TEST_EMAIL_DOMAIN = 'badbuddhas.test'
export const TEST_TELEGRAM_ID_MIN = 9999000001
export const TEST_TELEGRAM_ID_MAX = 9999999999

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestUserOptions {
  /** Create with email auth (default: false) */
  withEmail?: boolean
  /** Create with telegram_id (default: true) */
  withTelegram?: boolean
  /** ID of the current test run — required, generated once in globalSetup */
  testRunId: string
}

export interface TestUserResult {
  id: string
  email: string | null
  telegram_id: number | null
  /** Alias kept for compatibility with existing helpers */
  supabase_user_id: string | null
  /** Markers embedded in the record */
  markers: {
    is_test: true
    test_run_id: string
    created_by: 'autotest'
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTestEmail(): string {
  const uuid = crypto.randomUUID()
  return `autotest+${uuid}@${TEST_EMAIL_DOMAIN}`
}

function generateTestTelegramId(): number {
  const range = TEST_TELEGRAM_ID_MAX - TEST_TELEGRAM_ID_MIN + 1
  return TEST_TELEGRAM_ID_MIN + Math.floor(Math.random() * range)
}

/**
 * Builds a username that carries test-run markers.
 * Format: autotest__{testRunId}__{shortId}
 * This is the primary way markers are persisted in the `users` table
 * (which has no dedicated is_test / test_run_id columns).
 */
function markerUsername(testRunId: string): string {
  const short = crypto.randomUUID().slice(0, 8)
  return `autotest__${testRunId}__${short}`
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a uniquely-marked test user via the app's API endpoints.
 *
 * By default creates a Telegram user (`withTelegram: true`).
 * Pass `withEmail: true` to create an email/password user instead.
 * Both flags can be true — email user is created first, then Telegram
 * fields are NOT added (the app doesn't support merging in one step).
 *
 * @throws if the API call fails
 */
export async function createFactoryUser(
  options: TestUserOptions,
): Promise<TestUserResult> {
  const { withEmail = false, withTelegram = true, testRunId } = options

  if (!withEmail && !withTelegram) {
    throw new Error('At least one of withEmail or withTelegram must be true')
  }

  const markers = { is_test: true as const, test_run_id: testRunId, created_by: 'autotest' as const }

  // -- Telegram path (default) ---------------------------------------------
  if (withTelegram && !withEmail) {
    const telegram_id = generateTestTelegramId()
    const username = markerUsername(testRunId)

    const res = await fetch(`${BASE_URL}/api/auth/telegram-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_id,
        username,
        first_name: 'TestUser',
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(`[test-user-factory] telegram-sync failed: ${data.error || res.statusText}`)
    }

    const { user } = await res.json()
    return {
      id: user.id,
      email: null,
      telegram_id,
      supabase_user_id: user.supabase_user_id ?? null,
      markers,
    }
  }

  // -- Email path -----------------------------------------------------------
  const email = generateTestEmail()
  const password = `TestPass_${crypto.randomUUID().slice(0, 12)}`

  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(`[test-user-factory] register failed: ${data.error || res.statusText}`)
  }

  const { user } = await res.json()
  return {
    id: user.id,
    email,
    telegram_id: null,
    supabase_user_id: user.supabase_user_id ?? null,
    markers,
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Returns true if the given email belongs to a test user.
 */
export function isTestEmail(email: string): boolean {
  return email.endsWith(`@${TEST_EMAIL_DOMAIN}`)
}

/**
 * Returns true if the given telegram_id belongs to a test user.
 */
export function isTestTelegramId(telegramId: number): boolean {
  return telegramId >= TEST_TELEGRAM_ID_MIN && telegramId <= TEST_TELEGRAM_ID_MAX
}

/**
 * Returns true if the username carries autotest markers.
 */
export function isTestUsername(username: string): boolean {
  return username.startsWith('autotest__')
}
