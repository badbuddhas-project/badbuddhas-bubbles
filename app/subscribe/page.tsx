'use client'

import { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'

const WHITE = '#FFFFFF'
const PINK = '#C034A5'
const GREEN = '#54C68C'
const DARK_CARD = '#0A0A0A'
const CARD_BORDER = '#1A1A1A'

const FEATURES = [
  { emoji: '🎧', title: 'Все практики', desc: 'доступ к расширенной библиотеке' },
  { emoji: '📖', title: 'Теория дыхания', desc: 'статьи и материалы от инструкторов' },
  { emoji: '📅', title: 'Расписание', desc: 'живые сессии 2 раза в неделю' },
  { emoji: '💬', title: 'Сообщество', desc: 'закрытая группа в Telegram' },
] as const

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
  const widgetRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState<Step>('landing')
  const [email, setEmail] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState('')
  const [autoChecked, setAutoChecked] = useState(false)
  const goToPayment = () => {
    setStep('payment')
    setTimeout(() => {
      widgetRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const goToActivate = () => {
    setStep('activate')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const checkSubscription = useCallback(async (checkEmail: string) => {
    if (!checkEmail.trim()) return
    setIsChecking(true)
    setError('')

    try {
      const res = await fetch('/api/getcourse/check-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: checkEmail.trim() }),
      })
      const data = await res.json()

      if (data.hasSubscription) {
        const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
        await fetch('/api/auth/link-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: checkEmail.trim(), telegram_id: tgUser?.id || null }),
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
    if (isSuccess && successEmail) {
      setAutoChecked(true)
      setEmail(successEmail)
      setStep('activate')
      checkSubscription(successEmail)
      return
    }

    const stepParam = searchParams.get('step')
    if (stepParam === 'activate') {
      setAutoChecked(true)
      setStep('activate')
      return
    }

    const tgStartParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param
    if (tgStartParam === 'activate') {
      setAutoChecked(true)
      setStep('activate')
    }
  }, [searchParams, autoChecked, checkSubscription])

  const handlePostPaymentActivate = () => {
    const emailToUse = user?.email
    if (emailToUse) {
      setEmail(emailToUse)
      setStep('activate')
      checkSubscription(emailToUse)
    } else {
      goToActivate()
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 pb-12">
      {/* Back button */}
      <div className="pt-4 pb-2">
        <button
          onClick={() => {
            if (step === 'payment' || step === 'activate') { setStep('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
            else router.back()
          }}
          className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          ← назад
        </button>
      </div>

      {/* Step 1: Landing */}
      {step === 'landing' && (
        <>
          <div className="text-center pt-8 pb-10">
            <h1 className="text-3xl font-bold mb-3" style={{ color: WHITE }}>
              [ чёрный баблс ]
            </h1>
            <p className="text-lg" style={{ color: GREEN }}>
              раскрой дыхание полностью
            </p>
          </div>

          <div className="space-y-3 max-w-md mx-auto mb-10">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-4 flex items-start gap-4"
                style={{ backgroundColor: DARK_CARD, border: `1px solid ${CARD_BORDER}` }}
              >
                <span className="text-2xl mt-0.5">{f.emoji}</span>
                <div>
                  <p className="font-semibold text-white">{f.title}</p>
                  <p className="text-sm text-white/60">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-md mx-auto text-center">
            <button
              onClick={goToPayment}
              className="w-full py-4 rounded-2xl font-semibold text-lg text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: PINK }}
            >
              Оформить подписку
            </button>
            <p className="text-xs text-white/40 mt-4">
              оплата через GetCourse · отмена в любой момент
            </p>
            <button
              onClick={goToActivate}
              className="mt-4 bg-transparent border-none cursor-pointer"
              style={{ color: GREEN, fontSize: 13 }}
            >
              Уже есть подписка? Активировать
            </button>
          </div>
        </>
      )}

      {/* Step 2: Payment widget */}
      {step === 'payment' && (
        <div className="max-w-md mx-auto" ref={widgetRef}>
          <iframe
            src="/gc-widget.html"
            className="w-full rounded-2xl"
            style={{ minHeight: 600, background: DARK_CARD, border: 'none', borderRadius: 16 }}
            title="Оплата подписки"
          />

          <p className="text-xs text-white/40 mt-4 text-center">
            оплата через GetCourse · отмена в любой момент
          </p>
          <button
            onClick={handlePostPaymentActivate}
            className="w-full mt-4 bg-transparent border-none cursor-pointer text-center"
            style={{ color: GREEN, fontSize: 13 }}
          >
            Оплата прошла? Активировать подписку
          </button>
        </div>
      )}

      {/* Step 3: Activate */}
      {step === 'activate' && (
        <div className="max-w-md mx-auto pt-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold mb-2" style={{ color: WHITE }}>Активируйте подписку</h2>
            <p className="text-sm" style={{ color: '#CBCBCB', opacity: 0.6 }}>Введите email, который использовали при оплате</p>
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            disabled={isChecking}
            className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none mb-4 disabled:opacity-50"
            style={{ backgroundColor: DARK_CARD, border: `1px solid ${CARD_BORDER}` }}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckSubscription()}
          />

          {isChecking ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div
                className="rounded-full"
                style={{
                  width: 32, height: 32,
                  border: `3px solid ${CARD_BORDER}`,
                  borderTopColor: PINK,
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p className="text-sm font-medium text-white">Проверяем подписку...</p>
              <p className="text-xs text-center" style={{ color: '#CBCBCB', opacity: 0.5 }}>
                Это может занять немного времени.{'\n'}Не закрывайте и не обновляйте страницу
              </p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <button
              onClick={handleCheckSubscription}
              disabled={!email.trim()}
              className="w-full py-3 rounded-2xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: PINK }}
            >
              Проверить
            </button>
          )}

          {error && (
            <div className="mt-4 text-center">
              <p className="text-sm mb-3" style={{ color: '#ef4444' }}>{error}</p>
              <button
                onClick={() => { setError(''); setIsChecking(false) }}
                className="text-sm underline"
                style={{ color: '#CBCBCB', opacity: 0.6 }}
              >
                Попробовать снова
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && (
        <div className="max-w-md mx-auto pt-16 text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(84,198,140,0.15)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold mb-2" style={{ color: WHITE }}>Подписка активирована!</h2>
          <p className="text-sm mb-8" style={{ color: '#CBCBCB', opacity: 0.6 }}>
            Все практики и материалы теперь доступны
          </p>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 rounded-2xl font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: GREEN }}
          >
            Перейти к практикам
          </button>
        </div>
      )}
    </div>
  )
}
