import { test, expect } from '../helpers/fixtures'
import { loginViaUI, loginViaAPI, isAuthenticated } from '../helpers/auth.helper'
import { createTestUser, deleteTestUserByEmail } from '../helpers/supabase.helper'

const TEST_EMAIL = `e2e-auth-${Date.now()}@badbuddhas.test`
const TEST_PASSWORD = 'TestPassword123!'

test.describe('Email Authentication', () => {
  let testUserId: string

  test.beforeAll(async () => {
    const user = await createTestUser(TEST_EMAIL, TEST_PASSWORD)
    testUserId = user.id
  })

  test.afterAll(async () => {
    await deleteTestUserByEmail(TEST_EMAIL)
  })

  test('successful login redirects to home page', async ({ page }) => {
    await loginViaUI(page, TEST_EMAIL, TEST_PASSWORD)
    await expect(page).toHaveURL('/')
    // Verify session is active
    const authed = await isAuthenticated(page)
    expect(authed).toBe(true)
  })

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', 'WrongPassword999')
    await page.click('button[type="submit"]')

    // Should show error message
    const errorText = page.locator('p.text-red-400')
    await expect(errorText).toBeVisible({ timeout: 10000 })
    await expect(errorText).toContainText(/wrong|invalid|неверн/i)
    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })

  test('non-existent email shows error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'nonexistent-e2e@badbuddhas.test')
    await page.fill('input[type="password"]', 'SomePassword123')
    await page.click('button[type="submit"]')

    const errorText = page.locator('p.text-red-400')
    await expect(errorText).toBeVisible({ timeout: 10000 })
    await expect(errorText).toContainText(/wrong|invalid|неверн/i)
  })

  test('registration form submits and shows response', async ({ page }) => {
    const regEmail = `e2e-reg-${Date.now()}@badbuddhas.test`

    await page.goto('/register')
    await page.fill('input[type="email"]', regEmail)
    const passwordFields = page.locator('input[type="password"]')
    await passwordFields.nth(0).fill('TestPass123!')
    await passwordFields.nth(1).fill('TestPass123!')
    await page.click('button[type="submit"]')

    // After submit, should show either:
    // - Success: "Check your email to confirm your account"
    // - Error: red text (Supabase may reject .test domains or rate limit)
    const success = page.getByText(/check your email|проверьте почту/i)
    const error = page.locator('p.text-red-400')
    await expect(success.or(error)).toBeVisible({ timeout: 15000 })

    // Cleanup: delete the user created in our table (if any)
    await deleteTestUserByEmail(regEmail)
  })

  test('unauthenticated access to /profile redirects to login', async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()

    await page.goto('/profile')
    // AuthProvider should redirect to /login (or /onboarding)
    await page.waitForURL(/\/(login|onboarding)/, { timeout: 10000 })
  })
})
