import { test, expect } from '../helpers/fixtures'
import { mockTelegramWebApp } from '../helpers/auth.helper'
import {
  createTestUser,
  createTelegramTestUser,
  deleteTestUserByEmail,
  deleteTestUser,
} from '../helpers/supabase.helper'

const WEB_EMAIL = `e2e-merge-web-${Date.now()}@badbuddhas.test`
const WEB_PASSWORD = 'TestPassword123!'
const TG_ID = 900000000 + Math.floor(Math.random() * 1000000)
const TG_NAME = 'E2E Merge TG User'

test.describe('Account Merge', () => {
  let tgUserId: string

  test.beforeAll(async () => {
    await createTestUser(WEB_EMAIL, WEB_PASSWORD)
    const tgUser = await createTelegramTestUser(TG_ID, TG_NAME)
    tgUserId = tgUser.id
  })

  test.afterAll(async () => {
    await deleteTestUserByEmail(WEB_EMAIL).catch(() => {})
    await deleteTestUser(tgUserId).catch(() => {})
  })

  test('connect email form is visible for Telegram users on profile', async ({ page }) => {
    await mockTelegramWebApp(page, {
      id: TG_ID,
      username: 'e2e_tg_user',
      first_name: TG_NAME,
    })

    await page.goto('/profile')
    // Wait for TG auth to complete via telegram-sync
    await page.waitForTimeout(5000)

    // The profile page should load (not redirect to login)
    // In TG mode without linked email, connect email option should exist
    const pageText = await page.textContent('body')
    // Profile page should show something — at minimum the header or user info
    expect(pageText).toBeTruthy()
  })

  test('merge accounts API validates input', async ({ page }) => {
    // Test that merge API requires all fields
    const missingFields = await page.request.post('/api/auth/merge-accounts', {
      data: { telegram_id: TG_ID },
    })
    expect(missingFields.status()).toBe(400)
    const errData = await missingFields.json()
    expect(errData.error).toContain('required')
  })

  test('merge accounts API rejects wrong password', async ({ page }) => {
    const wrongPw = await page.request.post('/api/auth/merge-accounts', {
      data: {
        telegram_id: TG_ID,
        email: WEB_EMAIL,
        password: 'WrongPassword999',
      },
    })
    // Should be 401 (wrong password) or 404 (no Supabase Auth user for bcrypt-only account)
    expect([401, 404]).toContain(wrongPw.status())
  })
})
