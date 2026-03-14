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
