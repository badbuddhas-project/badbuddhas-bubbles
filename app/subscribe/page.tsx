'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'

const C = {
  bg: '#000',
  card: '#0A0A0A',
  border: '#1A1A1A',
  white: '#fff',
  text: '#CBCBCB',
  sub: 'rgba(203,203,203,0.45)',
  pink: '#C034A5',
  green: '#54C68C',
}

const FEATURES = [
  '30+ эксклюзивных практик дыхания',
  'Живые сессии с ведущими',
  'Теория: научная база и техники',
  'Расписание и чат сообщества',
]


type Step = 'landing' | 'payment' | 'activate' | 'success'

export default function SubscribePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SubscribePage />
    </Suspense>
  )
}

function SubscribePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()

  const [step, setStep] = useState<Step>('landing')
  const [email, setEmail] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState('')
  const [autoChecked, setAutoChecked] = useState(false)

  const goToPayment = () => {
    setStep('payment')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToActivate = () => {
    setStep('activate')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Try session cookie (web) then telegram-sync (TG) to get current user email */
  const getSessionEmail = async (): Promise<string | null> => {
    // Method 1: JWT session (web)
    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        const em = data.user?.email || data.user?.verified_email
        if (em) return em
      }
    } catch { /* ignore */ }

    // Method 2: telegram-sync (TG Mini App)
    try {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
      if (tgUser?.id) {
        const res = await fetch('/api/auth/telegram-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegram_id: tgUser.id,
            username: tgUser.username,
            first_name: tgUser.first_name,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const em = data.user?.email || data.user?.verified_email
          if (em) return em
        }
      }
    } catch { /* ignore */ }

    return null
  }

  const checkSubscription = useCallback(async (checkEmail: string) => {
    if (!checkEmail.trim()) return
    setIsChecking(true)
    setError('')

    try {
      const tgUserId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id
      const res = await fetch('/api/getcourse/check-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: checkEmail.trim(), telegram_id: tgUserId || null }),
      })
      const data = await res.json()

      if (data.hasSubscription) {
        const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
        await fetch('/api/auth/link-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: checkEmail.trim(), telegram_id: tgUser?.id || null, activate_premium: true }),
        })
        setStep('success')
      } else {
        setError('Подписка не найдена. Проверьте email или подождите несколько минут после оплаты')
      }
    } catch {
      setError('Ошибка проверки. Попробуйте ещё раз')
    } finally {
      setIsChecking(false)
    }
  }, [])

  const handleCheckSubscription = () => checkSubscription(email)

  // Auto-activate from success URL, query step, or Telegram startapp
  useEffect(() => {
    if (autoChecked || !searchParams) return

    const isSuccess = searchParams.get('success') === 'true'
    const successEmail = searchParams.get('email')
    if (isSuccess) {
      setAutoChecked(true)
      ;(async () => {
        const emailToUse = successEmail || await getSessionEmail()
        if (emailToUse) {
          setEmail(emailToUse)
          setStep('activate')
          checkSubscription(emailToUse)
        } else {
          setStep('activate')
        }
      })()
      return
    }

    const stepParam = searchParams.get('step')
    const tgStartParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param
    if (stepParam === 'activate' || tgStartParam === 'activate') {
      setAutoChecked(true)
      ;(async () => {
        console.log('[subscribe] auto-activate: resolving email...')
        const userEmail = await getSessionEmail()
        console.log('[subscribe] auto-activate: email =', userEmail)

        if (userEmail) {
          setEmail(userEmail)
          setStep('activate')
          checkSubscription(userEmail)
        } else {
          setStep('activate')
        }
      })()
      return
    }
  }, [searchParams, autoChecked, checkSubscription])

  const handleAutoActivate = async () => {
    console.log('[subscribe] handleAutoActivate: resolving email...')
    const userEmail = await getSessionEmail()
    console.log('[subscribe] handleAutoActivate: email =', userEmail)

    if (userEmail) {
      setEmail(userEmail)
      setStep('activate')
      checkSubscription(userEmail)
    } else {
      goToActivate()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, overflowY: 'auto' }}>

      {/* Close / Back button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px 0' }}>
        <button
          onClick={() => {
            if (step === 'payment' || step === 'activate') { setStep('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
            else router.back()
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="1.8"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Loading while useEffect resolves auto-activate */}
      {step === 'landing' && searchParams?.get('success') === 'true' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
          <div style={{ width: 24, height: 24, border: '2px solid #333', borderTopColor: '#CBCBCB', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ color: '#6b7280', fontSize: 14 }}>Проверяем подписку...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Step 1: Landing */}
      {step === 'landing' && searchParams?.get('success') !== 'true' && (
        <>
          {/* Hero with gradient glows */}
          <div style={{ padding: '12px 20px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(192,52,165,0.35) 0%,transparent 65%)' }} />
            <div style={{ position: 'absolute', bottom: -20, left: -20, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.2) 0%,transparent 65%)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', background: `linear-gradient(135deg,${C.pink},#7b1fa2)`, borderRadius: 20, padding: '4px 14px', marginBottom: 16 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: 2 }}>BLACK</span>
              </div>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: 14, color: C.text, lineHeight: 1.45 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Price */}
          <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 16px' }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>1 990 ₽</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>/ месяц</span>
          </div>

          {/* CTA */}
          <div style={{ padding: '0 16px 20px' }}>
            <button
              onClick={goToPayment}
              style={{ width: '100%', fontSize: 15, fontWeight: 500, background: `linear-gradient(135deg,${C.pink},#9c27b0)`, color: '#fff', border: 'none', borderRadius: 16, padding: '16px', cursor: 'pointer', letterSpacing: 0.5, boxShadow: '0 8px 28px rgba(192,52,165,0.45)' }}
            >
              ПОЛУЧИТЬ BLACK
            </button>
            <p style={{ fontSize: 12, color: C.sub, textAlign: 'center', marginTop: 12 }}>
              оплата через GetCourse · отмена в любой момент
            </p>
            <button
              onClick={goToActivate}
              style={{ display: 'block', margin: '8px auto 0', background: 'none', border: 'none', cursor: 'pointer', color: C.green, fontSize: 13 }}
            >
              Уже есть подписка? Активировать
            </button>
          </div>
        </>
      )}

      {/* Step 2: Payment widget */}
      {step === 'payment' && (
        <div style={{ padding: '0 16px', maxWidth: 480, margin: '0 auto' }}>
          <iframe
            src="/gc-widget.html"
            style={{ width: '100%', minHeight: 600, background: C.card, border: 'none', borderRadius: 16 }}
            title="Оплата подписки"
          />
          <p style={{ fontSize: 12, color: C.sub, textAlign: 'center', marginTop: 12 }}>
            оплата через GetCourse · отмена в любой момент
          </p>
          <button
            onClick={handleAutoActivate}
            style={{ display: 'block', margin: '12px auto 20px', background: 'none', border: 'none', cursor: 'pointer', color: C.green, fontSize: 13 }}
          >
            Оплата прошла? Активировать подписку
          </button>
        </div>
      )}

      {/* Step 3: Activate */}
      {step === 'activate' && (
        <div style={{ padding: '0 16px', maxWidth: 480, margin: '0 auto', paddingTop: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.white, marginBottom: 8 }}>Активируйте подписку</h2>
            <p style={{ fontSize: 13, color: C.sub }}>Введите email, который использовали при оплате</p>
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            disabled={isChecking}
            style={{ width: '100%', borderRadius: 12, padding: '12px 16px', color: C.white, fontSize: 14, outline: 'none', marginBottom: 16, background: C.card, border: `1px solid ${C.border}`, boxSizing: 'border-box', opacity: isChecking ? 0.5 : 1 }}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckSubscription()}
          />

          {isChecking ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.pink, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: C.white }}>Проверяем подписку...</p>
              <p style={{ fontSize: 12, color: C.sub, textAlign: 'center' }}>
                Это может занять немного времени. Не закрывайте страницу
              </p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <button
              onClick={handleCheckSubscription}
              disabled={!email.trim()}
              style={{ width: '100%', padding: '14px', borderRadius: 16, fontWeight: 600, fontSize: 15, color: '#fff', background: C.pink, border: 'none', cursor: 'pointer', opacity: email.trim() ? 1 : 0.5 }}
            >
              Проверить
            </button>
          )}

          {error && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</p>
              <button
                onClick={() => { setError(''); setIsChecking(false) }}
                style={{ fontSize: 13, color: C.sub, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Попробовать снова
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && (
        <div style={{ padding: '0 16px', maxWidth: 480, margin: '0 auto', paddingTop: 64, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(84,198,140,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 600, color: C.white, marginBottom: 8 }}>Подписка активирована!</h2>
          <p style={{ fontSize: 13, color: C.sub, marginBottom: 32 }}>
            Все практики и материалы теперь доступны
          </p>

          <button
            onClick={() => {
              sessionStorage.setItem('activate_handled', '1')
              window.location.href = '/'
            }}
            style={{ width: '100%', padding: '14px', borderRadius: 16, fontWeight: 600, fontSize: 15, color: '#fff', background: C.green, border: 'none', cursor: 'pointer' }}
          >
            Перейти к практикам
          </button>
        </div>
      )}
    </div>
  )
}
