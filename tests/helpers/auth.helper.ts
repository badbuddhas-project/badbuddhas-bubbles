/**
 * Browser-level auth helpers for Playwright tests.
 * Logs in via the UI or API and sets session cookies.
 */

import { type Page } from '@playwright/test'

/**
 * Logs in via the login page UI (fills form and submits).
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  // Wait for redirect to home page
  await page.waitForURL('/', { timeout: 10000 })
}

/**
 * Logs in via the API (faster, avoids UI rendering).
 * Sets the session cookie directly.
 */
export async function loginViaAPI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  const response = await page.request.post('/api/auth/login', {
    data: { email, password },
  })

  if (!response.ok()) {
    const body = await response.json()
    throw new Error(`Login failed: ${body.error}`)
  }
}

/**
 * Checks if the user is currently authenticated by calling /api/auth/session.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const response = await page.request.get('/api/auth/session')
  return response.ok()
}

/**
 * Logs out via the API.
 */
export async function logout(page: Page): Promise<void> {
  await page.request.post('/api/auth/logout')
}

/**
 * Injects a mock Telegram WebApp object into the page context.
 * Use in beforeEach for Telegram-dependent tests.
 */
export async function mockTelegramWebApp(
  page: Page,
  telegramUser: { id: number; username: string; first_name: string }
): Promise<void> {
  await page.addInitScript((user) => {
    (window as any).Telegram = {
      WebApp: {
        initData: `user=${encodeURIComponent(JSON.stringify(user))}`,
        initDataUnsafe: { user },
        ready: () => {},
        expand: () => {},
        close: () => {},
        MainButton: { show: () => {}, hide: () => {}, setText: () => {}, onClick: () => {} },
        BackButton: { show: () => {}, hide: () => {}, onClick: () => {} },
        themeParams: {},
        colorScheme: 'dark',
        isExpanded: true,
        viewportHeight: 800,
        viewportStableHeight: 800,
        platform: 'tdesktop',
        version: '7.0',
      },
    }
  }, telegramUser)
}
