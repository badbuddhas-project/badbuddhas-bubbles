'use client'

/**
 * Onboarding page: 3-slide intro shown once to new users before the catalog.
 * Design follows the BadBuddhas Bubbles mockup.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ONBOARDING_KEY } from '@/lib/constants'

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
        fontFamily: "var(--font-wix), sans-serif",
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <BrandMark size={20} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#FFFFFF',
            }}
          >
            badbuddhas
          </span>
        </div>
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

/* ── BrandMark SVG ────────────────────────────────────────────────────────── */

function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 116" fill="none">
      <path
        d="M107.441 57.9999C107.483 51.5528 107.84 45.1653 108.543 38.8494C109.288 32.1101 109.663 26.8618 109.663 23.1104C109.663 17.3313 108.418 12.745 105.934 9.35145C103.444 5.95793 99.906 3.54847 95.3074 2.12903C90.7089 0.709597 85.181 0 78.718 0C78.5691 0 71.7188 0 66.2268 1.9024C62.3549 3.2443 58.5128 3.73931 54.8256 3.79299C51.1384 3.73931 47.344 3.10117 43.4244 1.9024C36.8721 -0.101508 31.0881 0 30.9392 0C24.4821 0 18.9543 0.709597 14.3557 2.12903C9.7571 3.54847 6.21881 5.95793 3.7289 9.35145C1.24495 12.7509 0 17.3313 0 23.1104C0 26.8618 0.375273 32.1101 1.11986 38.8494C1.8168 45.1653 2.1742 51.5528 2.22185 57.9999C2.18016 64.447 1.82275 70.8344 1.11986 77.1503C0.375273 83.8896 0 89.138 0 92.8893C0 98.6685 1.24495 103.255 3.7289 106.648C6.21285 110.042 9.7571 112.451 14.3557 113.871C18.9543 115.29 24.4881 116 30.9451 116C31.0941 116 36.878 116.101 43.4364 114.097C47.3559 112.905 51.1503 112.26 54.8375 112.207C58.5247 112.26 62.3668 112.755 66.2387 114.097C71.7308 116 78.581 116 78.7299 116C85.187 116 90.7208 115.29 95.3194 113.871C99.9179 112.451 103.456 110.042 105.946 106.648C108.43 103.249 109.675 98.6685 109.675 92.8893C109.675 89.138 109.3 83.8896 108.555 77.1503C107.858 70.8344 107.501 64.447 107.453 57.9999H107.441ZM85.4312 109.231C84.3113 110.799 82.3218 111.587 79.4685 111.587C77.479 111.587 75.8826 110.775 74.2505 109.762C58.6379 100.094 52.8122 100.094 35.4186 109.762C33.7388 110.698 32.1901 111.587 30.2005 111.587C27.3413 111.587 25.3518 110.799 24.2379 109.231C23.118 107.656 22.5581 105.098 22.5581 101.555C22.5581 98.0124 22.9036 93.7004 23.5826 88.9352C24.2677 84.17 24.9527 78.9992 25.6317 73.4288C26.2274 68.5681 26.5431 63.5345 26.6206 58.3637H26.6384C26.6384 58.2444 26.6325 58.1251 26.6325 57.9999C26.6325 57.8806 26.6384 57.7613 26.6384 57.6361H26.6206C26.5431 52.4653 26.2334 47.4376 25.6317 42.571C24.9527 37.0006 24.2677 31.8298 23.5826 27.0646C22.9036 22.2993 22.5581 18.0947 22.5581 14.4447C22.5581 10.7947 23.118 8.33757 24.2379 6.76903C25.3577 5.2005 27.3473 4.41325 30.2005 4.41325C32.1901 4.41325 33.7388 5.30188 35.4186 6.23823C52.8122 15.9059 58.6319 15.9059 74.2505 6.23823C75.8885 5.22435 77.479 4.41325 79.4685 4.41325C82.3278 4.41325 84.3173 5.2005 85.4312 6.76903C86.5511 8.34353 87.111 10.9021 87.111 14.4447C87.111 17.9873 86.7655 22.2993 86.0864 27.0646C85.4014 31.8298 84.7164 37.0006 84.0373 42.571C83.4417 47.4317 83.126 52.4653 83.0485 57.6361H83.0306C83.0306 57.7554 83.0366 57.8746 83.0366 57.9999C83.0366 58.1192 83.0306 58.2384 83.0306 58.3637H83.0485C83.126 63.5345 83.4357 68.5621 84.0373 73.4288C84.7164 78.9992 85.4014 84.17 86.0864 88.9352C86.7655 93.7004 87.111 97.9051 87.111 101.555C87.111 105.205 86.5511 107.662 85.4312 109.231Z"
        fill="#FFFFFF"
      />
    </svg>
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
