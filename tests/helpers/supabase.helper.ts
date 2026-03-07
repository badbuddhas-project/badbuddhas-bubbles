/**
 * Test user management via API endpoints.
 * Uses the running app's API instead of direct Supabase access,
 * since service role key is only available in Vercel deployment.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

export interface TestUser {
  id: string
  email: string
  password: string
}

/**
 * Creates a test user via the /api/auth/register endpoint.
 * Uses the legacy bcrypt registration path (no Supabase Auth signup).
 */
export async function createTestUser(
  email: string,
  password: string
): Promise<TestUser> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    // User may already exist from a previous test run
    if (data.error === 'Email already registered') {
      // Try logging in to get the user ID
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (loginRes.ok) {
        const loginData = await loginRes.json()
        return { id: loginData.user.id, email, password }
      }
    }
    throw new Error(`Failed to create test user: ${data.error || res.statusText}`)
  }

  const data = await res.json()
  return { id: data.user.id, email, password }
}

/**
 * Creates a test user with a telegram_id via the /api/auth/telegram-sync endpoint.
 */
export async function createTelegramTestUser(
  telegramId: number,
  firstName: string
): Promise<{ id: string; telegramId: number }> {
  const res = await fetch(`${BASE_URL}/api/auth/telegram-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegram_id: telegramId,
      username: `test_tg_${telegramId}`,
      first_name: firstName,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(`Failed to create TG test user: ${data.error || res.statusText}`)
  }

  const data = await res.json()
  return { id: data.user.id, telegramId }
}

/**
 * Cleanup is a no-op when we don't have service role key access.
 * Test users with unique emails (timestamp-based) won't interfere.
 */
export async function deleteTestUser(_userId: string): Promise<void> {
  // No-op: cleanup requires service role key (only available in Vercel)
}

export async function deleteTestUserByEmail(_email: string): Promise<void> {
  // No-op: cleanup requires service role key (only available in Vercel)
}

/**
 * Fetches a user by logging in and reading session data.
 */
export async function getTestUser(userId: string) {
  // Without service role key, we can't query users directly.
  // Return null — tests should use API responses instead.
  return null
}
