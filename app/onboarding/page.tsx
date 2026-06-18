'use client'

/**
 * Onboarding page: 3-slide intro shown once to new users before the catalog.
 * Design follows the BadBuddhas Bubbles mockup.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ONBOARDING_KEY } from '@/lib/constants'
import BreathVisual from '@/components/BreathVisual'
import { ymEvent } from '@/lib/analytics'

function resolvePostOnboardingRoute(): string {
  const tg = (window as any).Telegram?.WebApp
  if (tg && tg.initData && tg.initData.length > 0) return '/'
  return '/login'
}

const steps = [
  { category: 'slow', title: 'Дышите осознанно', desc: 'Практики дыхания для снятия стресса, восстановления энергии и внутреннего баланса' },
  { category: 'ground', title: 'Найдите свой темп', desc: 'От 5 до 30 минут — выбирайте практику под своё настроение и расписание' },
  { category: 'rise', title: 'Практикуйте каждый день' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') {
      router.replace(resolvePostOnboardingRoute())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goToStep = useCallback((index: number) => {
    setCurrentStep(Math.max(0, Math.min(index, steps.length - 1)))
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
    setTouchEnd(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    const diff = touchStart - touchEnd
    const threshold = 50
    if (diff > threshold) goToStep(currentStep + 1)
    else if (diff < -threshold) goToStep(currentStep - 1)
  }

  const handleFinish = () => {
    ymEvent('onboarding_completed')
    localStorage.setItem(ONBOARDING_KEY, 'true')
    router.replace(resolvePostOnboardingRoute())
  }

  const isLastStep = currentStep === steps.length - 1
  const s = steps[currentStep]

  return (
    <div
      style={{
        height: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip — top right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px' }}>
        <button
          onClick={handleFinish}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: '#9ca3af',
            cursor: 'pointer',
          }}
        >
          Пропустить
        </button>
      </div>

      {/* BreathVisual */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 24px' }}>
        <BreathVisual category={s.category} size={280} borderRadius={0} animate showBubbles={false} />
      </div>

      {/* Bottom content */}
      <div
        style={{
          flex: 1,
          padding: '0 28px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Progress bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: i <= currentStep ? 'rgba(203,203,203,0.7)' : '#1A1A1A',
                  flex: 1,
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.2,
            }}
          >
            {s.title}
          </div>
          {s.desc && (
            <div
              style={{
                fontSize: 15,
                color: '#666',
                lineHeight: 1.6,
                marginTop: 12,
              }}
            >
              {s.desc}
            </div>
          )}
        </div>

        {/* Button */}
        <button
          onClick={isLastStep ? handleFinish : () => goToStep(currentStep + 1)}
          style={{
            width: '100%',
            fontSize: 15,
            fontWeight: 700,
            color: '#000',
            background: '#CBCBCB',
            border: 'none',
            borderRadius: 16,
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          {isLastStep ? 'Начать' : 'Далее'}
        </button>
      </div>
    </div>
  )
}
