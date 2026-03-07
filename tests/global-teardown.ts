/**
 * Playwright global teardown.
 *
 * Cleans up all test users created during this test run (by TEST_RUN_ID).
 */

import { cleanupTestUsers } from './helpers/test-user-cleanup'

export default async function globalTeardown() {
  const testRunId = process.env.TEST_RUN_ID

  if (!testRunId) {
    console.warn('[global-teardown] TEST_RUN_ID not set — skipping cleanup.')
    return
  }

  console.log(`[global-teardown] Cleaning up test users for run ${testRunId}...`)

  try {
    const result = await cleanupTestUsers({
      dryRun: false,
      runId: testRunId,
    })
    console.log(
      `[global-teardown] Cleanup done: found=${result.found}, deleted=${result.deleted}, `
      + `skipped=${result.skipped}, warnings=${result.warnings.length}`,
    )
    if (result.warnings.length > 0) {
      console.warn('[global-teardown] Warnings:')
      result.warnings.forEach((w) => console.warn(`  - ${w}`))
    }
  } catch (err) {
    // Don't fail the teardown — log and move on
    console.warn('[global-teardown] Cleanup failed (non-fatal):', (err as Error).message)
  }
}
