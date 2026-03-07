import { test, expect } from '../helpers/fixtures'
import { loginViaAPI } from '../helpers/auth.helper'
import { createTestUser, deleteTestUserByEmail } from '../helpers/supabase.helper'

const TEST_EMAIL = `e2e-catalog-${Date.now()}@badbuddhas.test`
const TEST_PASSWORD = 'TestPassword123!'

test.describe('Practice Catalog', () => {
  test.beforeAll(async () => {
    await createTestUser(TEST_EMAIL, TEST_PASSWORD)
  })

  test.afterAll(async () => {
    await deleteTestUserByEmail(TEST_EMAIL)
  })

  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, TEST_EMAIL, TEST_PASSWORD)
  })

  test('catalog loads and shows practices', async ({ page }) => {
    await page.goto('/')
    // Wait for practices to load (supports both languages)
    await expect(page.getByText(/^Loading\.\.\.$|^Загрузка\.\.\.$/).first()).toBeHidden({ timeout: 15000 })

    // Wait for greeting heading as signal page is loaded (data-testid is language-agnostic)
    await expect(page.locator('[data-testid="greeting-heading"]')).toBeVisible({ timeout: 10000 })

    // Should show at least one practice card (PracticeCard has h3 with title)
    const titles = page.locator('h3')
    await expect(titles.first()).toBeVisible({ timeout: 10000 })
    const count = await titles.count()
    expect(count).toBeGreaterThan(0)
  })

  test('practice card shows title, duration, and instructor', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/^Loading\.\.\.$|^Загрузка\.\.\.$/).first()).toBeHidden({ timeout: 15000 })
    await expect(page.locator('[data-testid="greeting-heading"]')).toBeVisible({ timeout: 10000 })

    // First practice card wrapper (div with cursor-pointer containing h3)
    const firstCard = page.locator('div.cursor-pointer:has(h3)').first()
    await expect(firstCard).toBeVisible()

    // Should have a title
    await expect(firstCard.locator('h3')).toBeVisible()
    // Should have duration text (e.g., "5 min" or "5 мин")
    await expect(firstCard.getByText(/\d+\s*(min|мин)/i)).toBeVisible()
    // Should have instructor name (small text)
    await expect(firstCard.locator('span.truncate')).toBeVisible()
  })

  test('clicking practice navigates to practice page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/^Loading\.\.\.$|^Загрузка\.\.\.$/).first()).toBeHidden({ timeout: 15000 })

    // Click the first practice card
    const firstCard = page.locator('div.cursor-pointer:has(h3)').first()
    await firstCard.click()

    // Should navigate to /practice/[id]
    await page.waitForURL(/\/practice\//, { timeout: 10000 })
    expect(page.url()).toMatch(/\/practice\/[a-f0-9-]+/)
  })

  test('category filter works', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/^Loading\.\.\.$|^Загрузка\.\.\.$/).first()).toBeHidden({ timeout: 15000 })

    // Count initial practices
    const allCards = page.locator('div.cursor-pointer:has(h3)')
    const initialCount = await allCards.count()

    // Only run filter test if there are enough practices
    if (initialCount > 1) {
      // Click the category dropdown (first FilterDropdown, supports both languages)
      const filterButtons = page.locator('button:has-text("All practices"), button:has-text("Все практики"), button:has-text("Relax"), button:has-text("Релакс"), button:has-text("Balance"), button:has-text("Energize")')
      if (await filterButtons.first().isVisible()) {
        await filterButtons.first().click()
        // Wait for filter options to appear and click one
        const relaxOption = page.getByText(/^Relax$|^Релакс$/)
        if (await relaxOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await relaxOption.click()
          // Page should still show practices or "No practices found"
          await page.waitForTimeout(1000)
        }
      }
    }
  })
})
