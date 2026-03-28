'use client'

/**
 * Onboarding page: 3-slide intro shown once to new users before the catalog.
 * Design follows the BadBuddhas Bubbles mockup.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ONBOARDING_KEY } from '@/lib/constants'
import { BrandMark } from '@/components/BrandMark'
import { EnergyBlob } from '@/components/EnergyBlob'
import { ymEvent } from '@/lib/analytics'

function resolvePostOnboardingRoute(): string {
  const tg = (window as any).Telegram?.WebApp
  if (tg && tg.initData && tg.initData.length > 0) return '/'
  return '/login'
}

const onboardingTexts = {
  ru: {
    slide1_title: 'КАК ТЫ ХОЧЕШЬ СЕБЯ ЧУВСТВОВАТЬ?',
    slide1_desc: 'Релакс, баланс или заряд энергии — выбери своё состояние',
    slide2_title: 'ПОЧУВСТВУЙ СИЛУ ДЫХАНИЯ',
    slide2_desc: 'Дыхательные практики под электронную музыку от лучших ведущих',
    slide3_title: 'ПРИСОЕДИНЯЙСЯ К СООБЩЕСТВУ',
    slide3_desc: 'Присоединяйся к сообществу тех, кто дышит осознанно',
    next: 'далее',
    start: 'начать',
    skip: 'пропустить',
  },
  en: {
    slide1_title: 'HOW DO YOU WANT TO FEEL?',
    slide1_desc: 'Relax, balance or energy boost — choose your state',
    slide2_title: 'FEEL THE POWER OF BREATH',
    slide2_desc: 'Breathwork practices with electronic music from top instructors',
    slide3_title: 'JOIN A GROWING COMMUNITY',
    slide3_desc: 'Join the community of conscious breathers',
    next: 'next',
    start: 'start',
    skip: 'skip',
  },
}

function detectLang(): 'ru' | 'en' {
  if (typeof window !== 'undefined') {
    const code = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code?.slice(0, 2)
    if (code === 'en') return 'en'
  }
  return 'ru'
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [t, setT] = useState(onboardingTexts.ru)

  useEffect(() => {
    setT(onboardingTexts[detectLang()])
  }, [])

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') {
      router.replace(resolvePostOnboardingRoute())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const slides = [
    { title: t.slide1_title, subtitle: t.slide1_desc },
    { title: t.slide2_title, subtitle: t.slide2_desc },
    { title: t.slide3_title, subtitle: t.slide3_desc },
  ]

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(Math.max(0, Math.min(index, 2)))
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
    ymEvent('onboarding_completed')
    localStorage.setItem(ONBOARDING_KEY, 'true')
    router.replace(resolvePostOnboardingRoute())
  }

  const isLastSlide = currentSlide === slides.length - 1

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
          {t.skip}
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
          {slides.map((slide, index) => (
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
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => goToSlide(i)}
              style={{
                width: 56,
                height: 3,
                borderRadius: 2,
                background: i <= currentSlide ? '#CBCBCB' : '#313333',
                transition: 'background 0.3s',
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
          {isLastSlide ? t.start : t.next}
        </span>
      </div>

    </main>
  )
}

/* ── Slide illustrations ──────────────────────────────────────────────────── */

function SlideIllustration({ index }: { index: number }) {
  const types = ['slow', 'ground', 'rise']
  return (
    <div style={{ marginBottom: 40 }}>
      <EnergyBlob type={types[index]} size={160} radius={80} />
    </div>
  )
}
