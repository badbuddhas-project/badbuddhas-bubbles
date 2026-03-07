/**
 * Yandex.Metrika event helpers.
 * All calls are no-ops on the server and when the counter is not loaded.
 */

export const YM_ID = 107145193

export function ymEvent(goalName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (typeof window.ym !== 'function') return
  window.ym(YM_ID, 'reachGoal', goalName, params)
}

export function getPlatform(): 'telegram' | 'web' {
  if (typeof window === 'undefined') return 'web'
  return window.Telegram?.WebApp?.initData ? 'telegram' : 'web'
}

// TODO: ym event 'premium_wall_shown' — paywall component is removed (PROJECT_RULES §21).
// Add ymEvent('premium_wall_shown', { platform: getPlatform() }) when paywall is re-introduced.

declare global {
  interface Window {
    ym: (id: number, action: string, target: string, params?: unknown) => void
    Telegram?: { WebApp?: { initData?: string; platform?: string } }
  }
}
