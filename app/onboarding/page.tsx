'use client'

/**
 * Onboarding page: 3-slide intro shown once to new users before the catalog.
 * Design follows the BadBuddhas Bubbles mockup.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ONBOARDING_KEY } from '@/lib/constants'
import { BrandMark } from '@/components/BrandMark'

function resolvePostOnboardingRoute(): string {
  const tg = (window as any).Telegram?.WebApp
  if (tg && tg.initData && tg.initData.length > 0) return '/'
  return '/login'
}

const SLIDES = [
  {
    title: 'HOW DO YOU WANT TO FEEL?',
    subtitle: 'Релакс, баланс или заряд энергии — выбери своё состояние',
  },
  {
    title: 'FEEL THE POWER OF BREATH',
    subtitle: 'Дыхательные практики под электронную музыку от лучших ведущих',
  },
  {
    title: 'JOIN A GROWING COMMUNITY',
    subtitle: 'Присоединяйся к сообществу тех, кто дышит осознанно',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') {
      router.replace(resolvePostOnboardingRoute())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(Math.max(0, Math.min(index, SLIDES.length - 1)))
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
    if (diff > threshold) goToSlide(currentSlide + 1)
    else if (diff < -threshold) goToSlide(currentSlide - 1)
  }

  const handleFinish = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    router.replace(resolvePostOnboardingRoute())
  }

  const isLastSlide = currentSlide === SLIDES.length - 1

  return (
    <main
      style={{
        height: '100%',
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        padding: '44px 24px 36px',
      }}
    >
      {/* Header: logo left + skip right */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 40,
        }}
      >
        <BrandMark size={20} />
        <span
          onClick={handleFinish}
          style={{
            fontSize: 12,
            color: '#CBCBCB',
            opacity: 0.5,
            cursor: 'pointer',
          }}
        >
          пропустить
        </span>
      </div>

      {/* Slides area */}
      <div
        style={{ flex: 1, overflow: 'hidden' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            display: 'flex',
            height: '100%',
            transition: 'transform 0.3s ease-out',
            transform: `translateX(-${currentSlide * 100}%)`,
          }}
        >
          {SLIDES.map((slide, index) => (
            <div
              key={index}
              style={{
                width: '100%',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SlideIllustration index={index} />

              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textAlign: 'center',
                  marginBottom: 12,
                  letterSpacing: '0.02em',
                  margin: 0,
                  marginTop: 0,
                }}
              >
                {slide.title}
              </h2>

              <p
                style={{
                  fontSize: 14,
                  color: '#CBCBCB',
                  opacity: 0.6,
                  textAlign: 'center',
                  lineHeight: 1.5,
                  maxWidth: 260,
                  marginTop: 12,
                }}
              >
                {slide.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: pagination + next */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {/* Dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => goToSlide(i)}
              style={{
                width: i === currentSlide ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === currentSlide ? '#FFFFFF' : '#313333',
                transition: 'all 0.3s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Next / Start */}
        <span
          onClick={isLastSlide ? handleFinish : () => goToSlide(currentSlide + 1)}
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          {isLastSlide ? 'начать' : 'далее'}
        </span>
      </div>

    </main>
  )
}

/* ── Slide illustrations ──────────────────────────────────────────────────── */

function SlideIllustration({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: '50%',
            overflow: 'hidden',
            marginBottom: 40,
            backgroundImage: 'url(/images/onboarding-blob.png)',
            backgroundSize: '180%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )
    case 1:
      return (
        <div
          style={{
            width: 160,
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <img
            src="/images/onboarding-cycle.png"
            alt=""
            width={100}
            height={100}
            style={{ opacity: 0.7 }}
          />
        </div>
      )
    case 2:
      return (
        <div
          style={{
            width: 160,
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <img
            src="/images/onboarding-community.png"
            alt=""
            width={100}
            height={100}
            style={{ opacity: 0.7 }}
          />
        </div>
      )
    default:
      return null
  }
}
