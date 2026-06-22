const YM_COUNTER_ID = 107703259;

type YmParams = Record<string, string | number | boolean | undefined>;

export function ymEvent(eventName: string, params?: YmParams): void {
  try {
    if (typeof window !== 'undefined' && typeof window.ym === 'function') {
      window.ym(YM_COUNTER_ID, 'reachGoal', eventName, params);
    }
  } catch (e) {
    console.warn('[analytics] ymEvent error:', e);
  }
}

/**
 * Tie the Metrika ClientID to our real user and attach user-level attributes.
 * Call once after auth resolves a user. `userId` shows up in the "Посетители" report;
 * `params` become user params for segmentation (is_premium, platform, etc.).
 */
export function ymIdentify(userId: string | number, params?: YmParams): void {
  try {
    if (typeof window === 'undefined' || typeof window.ym !== 'function') return
    window.ym(YM_COUNTER_ID, 'setUserID', String(userId));
    window.ym(YM_COUNTER_ID, 'userParams', { UserID: String(userId), ...(params || {}) });
  } catch (e) {
    console.warn('[analytics] ymIdentify error:', e);
  }
}

export function getPlatform(): 'telegram' | 'web' {
  if (typeof window === 'undefined') return 'web'
  return window.Telegram?.WebApp?.initData ? 'telegram' : 'web'
}

declare global {
  interface Window {
    ym?: (...args: any[]) => void;
    Telegram?: { WebApp?: { initData?: string; platform?: string } }
  }
}
