'use client'

/**
 * Onboarding page: animated multi-step intro shown to new users before the catalog.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ONBOARDING_KEY } from '@/lib/constants'
import { useTranslation } from '@/lib/i18n'

// After onboarding: go to '/' in Telegram, else '/login' in browser.
function resolvePostOnboardingRoute(): string {
  const tg = (window as any).Telegram?.WebApp
  if (tg && tg.initData && tg.initData.length > 0) return '/'
  return '/login'
}

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const SLIDES = useMemo(() => [
    {
      title: t('onboarding.slide1Title'),
      description: t('onboarding.slide1Subtitle'),
    },
    {
      title: t('onboarding.slide2Title'),
      description: t('onboarding.slide2Subtitle'),
    },
    {
      title: t('onboarding.slide3Title'),
      description: t('onboarding.slide3Subtitle'),
    },
  ], [t])

  // Check if onboarding was already completed — run ONCE on mount only.
  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY) !== 'true') return
    router.replace(resolvePostOnboardingRoute())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(Math.max(0, Math.min(index, SLIDES.length - 1)))
  }, [SLIDES.length])

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

    if (diff > threshold) {
      // Swipe left - next slide
      goToSlide(currentSlide + 1)
    } else if (diff < -threshold) {
      // Swipe right - previous slide
      goToSlide(currentSlide - 1)
    }
  }

  const handleGetStarted = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    router.replace(resolvePostOnboardingRoute())
  }

  const isLastSlide = currentSlide === SLIDES.length - 1

  return (
    <main className="min-h-screen bg-black flex flex-col">
      {/* Logo */}
      <header className="flex justify-center pt-12 pb-8">
        <Logo />
      </header>

      {/* Slides */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {SLIDES.map((slide, index) => (
            <div
              key={index}
              className="w-full flex-shrink-0 flex flex-col items-center justify-center px-8 text-center"
            >
              {/* Decorative circles */}
              <div className="relative w-48 h-48 mb-12">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600/30 to-pink-500/30 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-violet-600/20 to-pink-500/20" />
                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-violet-600/10 to-pink-500/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <SlideIcon index={index} />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-4 tracking-wide">
                {slide.title}
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed max-w-xs">
                {slide.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="px-6 pb-12">
        {/* Page indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 bg-emerald-300'
                  : 'bg-zinc-600'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={isLastSlide ? handleGetStarted : () => goToSlide(currentSlide + 1)}
            className="w-full py-4 bg-emerald-300 text-black font-semibold rounded-2xl"
          >
            {isLastSlide ? t('onboarding.getStarted') : t('common.next')}
          </button>

          {!isLastSlide && (
            <button
              onClick={handleGetStarted}
              className="w-full py-4 text-zinc-500 font-medium"
            >
              {t('onboarding.skip')}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

function Logo() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center">
        <span className="text-white font-bold text-xl">B</span>
      </div>
      <span className="text-white font-bold tracking-widest text-sm">
        BADBUDDHAS
      </span>
    </div>
  )
}

function SlideIcon({ index }: { index: number }) {
  const className = 'w-16 h-16 text-white/80'

  switch (index) {
    case 0:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
        </svg>
      )
    case 1:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      )
    case 2:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      )
    default:
      return null
  }
}
