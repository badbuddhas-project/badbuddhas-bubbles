/**
 * Shared test fixtures for Playwright tests.
 * Provides pre-configured page with common settings.
 */

import { test as base } from '@playwright/test'

export const test = base.extend({
  // Override page with common settings
  page: async ({ page }, use) => {
    // Set localStorage to skip onboarding redirect
    await page.addInitScript(() => {
      localStorage.setItem('badbuddhas_onboarding_completed', 'true')
    })
    await use(page)
  },
})

export { expect } from '@playwright/test'
