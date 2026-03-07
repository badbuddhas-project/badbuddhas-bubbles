/**
 * Playwright global setup.
 *
 * 1. Generates a unique TEST_RUN_ID for this test run.
 * 2. Cleans up orphaned test users older than 24 hours (from crashed previous runs).
 */

import { randomUUID } from 'crypto'
import { cleanupTestUsers } from './helpers/test-user-cleanup'

export default async function globalSetup() {
  // Generate a unique run ID and expose it to all workers
  const testRunId = randomUUID()
  process.env.TEST_RUN_ID = testRunId
  console.log(`[global-setup] TEST_RUN_ID = ${testRunId}`)

  // Clean up orphaned test users from previous crashed runs (older than 24h)
  try {
    console.log('[global-setup] Cleaning up orphaned test users older than 24h...')
    const result = await cleanupTestUsers({
      dryRun: false,
      olderThan: '24h',
    })
    console.log(
      `[global-setup] Orphan cleanup done: deleted=${result.deleted}, skipped=${result.skipped}, warnings=${result.warnings.length}`,
    )
  } catch (err) {
    // Don't fail the test run if cleanup fails (env vars may be missing locally)
    console.warn('[global-setup] Orphan cleanup failed (non-fatal):', (err as Error).message)
  }
}
