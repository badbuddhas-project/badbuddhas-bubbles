import { test, expect } from '../helpers/fixtures'
import { loginViaAPI } from '../helpers/auth.helper'
import { createTestUser, deleteTestUserByEmail } from '../helpers/supabase.helper'

const TEST_EMAIL = `e2e-stats-${Date.now()}@badbuddhas.test`
const TEST_PASSWORD = 'TestPassword123!'

test.describe('Profile Statistics', () => {
  test.beforeAll(async () => {
    await createTestUser(TEST_EMAIL, TEST_PASSWORD)
  })

  test.afterAll(async () => {
    await deleteTestUserByEmail(TEST_EMAIL)
  })

  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, TEST_EMAIL, TEST_PASSWORD)
  })

  test('profile page shows streak counter', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByText(/^Loading\.\.\.$|^Загрузка\.\.\.$/).first()).toBeHidden({ timeout: 15000 })

    // Stats section with streak (data-testid is language-agnostic)
    const streakStat = page.locator('[data-testid="stat-streak"]')
    await expect(streakStat).toBeVisible({ timeout: 10000 })
  })

  test('profile page shows practice count', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByText(/^Loading\.\.\.$|^Загрузка\.\.\.$/).first()).toBeHidden({ timeout: 15000 })

    // Practices stat
    const practicesStat = page.locator('[data-testid="stat-practices"]')
    await expect(practicesStat).toBeVisible({ timeout: 10000 })
  })

  test('profile page shows minutes stat', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByText(/^Loading\.\.\.$|^Загрузка\.\.\.$/).first()).toBeHidden({ timeout: 15000 })

    // Minutes stat
    const minutesStat = page.locator('[data-testid="stat-minutes"]')
    await expect(minutesStat).toBeVisible({ timeout: 10000 })
  })

  test('stats section renders without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/profile')
    await expect(page.getByText(/^Loading\.\.\.$|^Загрузка\.\.\.$/).first()).toBeHidden({ timeout: 15000 })

    // Wait for stats to fully render
    await expect(page.locator('[data-testid="stat-streak"]')).toBeVisible({ timeout: 10000 })

    // Filter out expected/known errors (e.g. Supabase auth refresh)
    const unexpectedErrors = errors.filter(
      (e) => !e.includes('AuthSessionMissing') && !e.includes('session_not_found')
    )
    expect(unexpectedErrors).toHaveLength(0)
  })
})
