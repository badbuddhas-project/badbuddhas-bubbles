/**
 * Telegram Mini App utilities.
 *
 * All helpers are safe to call from any environment — they guard against
 * SSR (typeof window === 'undefined') and non-Telegram browsers internally.
 */

/**
 * Returns true only when the page is running inside an actual Telegram Mini App.
 *
 * Detection strategy (3 layers):
 *  1. window.Telegram.WebApp.initData — non-empty string injected by Telegram
 *  2. URL query params — tgWebAppData / tgWebAppStartParam added by Telegram
 *  3. URL hash — Telegram can pass initData in the hash fragment
 */
export const isTelegramWebApp = (): boolean => {
  if (typeof window === 'undefined') return false

  // Method 1: Telegram WebApp object (most reliable)
  const tg = (window as any).Telegram?.WebApp
  if (tg && tg.initData && tg.initData.length > 0) {
    return true
  }

  // Method 2: URL query params (Telegram adds tgWebAppData)
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.has('tgWebAppData') || urlParams.has('tgWebAppStartParam')) {
    return true
  }

  // Method 3: hash fragment (Telegram may pass data in hash)
  if (window.location.hash.includes('tgWebAppData')) {
    return true
  }

  return false
}

/**
 * Returns the Telegram user from initDataUnsafe, or null if not available.
 */
export function getTelegramUser(): {
  id: number
  first_name: string
  last_name?: string
  username?: string
} | null {
  if (typeof window === 'undefined') return null
  const user = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
  if (!user?.id) return null
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
  }
}

/**
 * Expands the Mini App to full-screen height.
 * Safe to call in browser — does nothing if not in Telegram.
 */
export function expandTelegramApp(): void {
  if (typeof window === 'undefined') return
  const tg = (window as any).Telegram?.WebApp
  if (!tg) return
  try {
    tg.expand()
    console.debug('[Telegram] expand() called')
  } catch (err) {
    console.warn('[Telegram] expand() failed:', err)
  }
}

export function closeTelegramApp(): void {
  if (typeof window === 'undefined') return
  const tg = (window as any).Telegram?.WebApp
  if (!tg) return
  try {
    tg.close()
  } catch (err) {
    console.warn('[Telegram] close() failed:', err)
  }
}
