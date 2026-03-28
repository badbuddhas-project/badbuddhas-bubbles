'use client'

/**
 * Home screen: hero carousel, practices horizontal scroll, Black CTA.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { usePractices } from '@/hooks/usePractices'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useTranslation } from '@/lib/i18n'
import BreathVisual from '@/components/BreathVisual'
import { BrandMark } from '@/components/BrandMark'
import type { Practice } from '@/types/database'
import { ymEvent, getPlatform } from '@/lib/analytics'

const CAT_COLORS: Record<string, string> = {
  relax: '#8b5cf6',
  balance: '#3b82f6',
  energize: '#ec4899',
}

const CAT_DISPLAY: Record<string, string> = {
  relax: 'SLOW', balance: 'GROUND', energize: 'RISE',
  slow: 'SLOW', ground: 'GROUND', rise: 'RISE',
}

export default function Home() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { user, isLoading: isUserLoading } = useUser()
  const { practices, isLoading: isPracticesLoading } = usePractices()
  const { isCompleted: isOnboardingCompleted, isLoading: isOnboardingLoading } = useOnboarding()

  useEffect(() => {
    ymEvent('app_opened', { platform: getPlatform() })
  }, [])

  useEffect(() => {
    if (!isOnboardingLoading && !isOnboardingCompleted) {
      router.replace('/onboarding')
    }
  }, [isOnboardingCompleted, isOnboardingLoading, router])

  useEffect(() => {
    const tgStartParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param
    if (tgStartParam === 'activate' && !user?.is_premium && !sessionStorage.getItem('activate_handled')) {
      sessionStorage.setItem('activate_handled', '1')
      router.push('/subscribe?step=activate')
    }
  }, [router, user?.is_premium])

  useEffect(() => {
    if (!isPracticesLoading && practices.length > 0) {
      ymEvent('practice_list_viewed', { platform: getPlatform() })
    }
  }, [isPracticesLoading, practices.length])

  const isPremium = user?.is_premium ?? false

  const handlePracticeClick = (practice: Practice) => {
    router.push(`/practice/${practice.id}`)
  }

  if (isUserLoading || isOnboardingLoading || !isOnboardingCompleted) {
    return (
      <main style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </main>
    )
  }

  const featuredPractice = practices.find(p => !p.is_premium) || practices[0]
  const lockedPractices = practices.filter(p => p.is_premium)

  return (
    <main style={{ background: '#000', minHeight: '100vh', padding: '44px 16px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BrandMark size={22} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '0.02em' }}>badbuddhas</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            {t('catalog.hi')} {user?.first_name || (language === 'en' ? 'breather' : 'дышатель')}
          </span>
          <button
            onClick={() => router.push('/profile')}
            style={{ width: 32, height: 32, borderRadius: '50%', background: '#313333', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1A1A1A', cursor: 'pointer', padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBCBCB" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hero carousel */}
      <HeroCarousel
        featuredPractice={featuredPractice ?? null}
        isPremium={isPremium}
        onPracticeClick={handlePracticeClick}
        onSubscribe={() => router.push('/subscribe')}
        catColors={CAT_COLORS}
      />

      {/* Practices section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Практики</span>
          <button
            onClick={() => router.push('/catalog')}
            style={{ fontSize: 11, fontWeight: 600, color: '#CBCBCB', opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}
          >
            ВСЕ →
          </button>
        </div>
        {isPracticesLoading ? (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ width: 160, height: 210, flexShrink: 0, borderRadius: 16, background: '#0A0A0A' }} />
            ))}
          </div>
        ) : (
          <PracticesScroll
            practices={practices}
            isPremium={isPremium}
            onPracticeClick={handlePracticeClick}
            onSubscribe={() => router.push('/subscribe')}
            catColors={CAT_COLORS}
          />
        )}
      </div>

      {/* Black CTA — free users only */}
      {!isPremium && (
        <BlackCTA
          lockedPractices={lockedPractices.slice(0, 3)}
          onSubscribe={() => router.push('/subscribe')}
        />
      )}

    </main>
  )
}

// ─── Hero Carousel ────────────────────────────────────────────────────────────

function HeroCarousel({
  featuredPractice,
  isPremium,
  onPracticeClick,
  onSubscribe,
  catColors,
}: {
  featuredPractice: Practice | null
  isPremium: boolean
  onPracticeClick: (p: Practice) => void
  onSubscribe: () => void
  catColors: Record<string, string>
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setActiveIdx(Math.round(el.scrollLeft / el.clientWidth))
  }

  const scrollTo = (idx: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          gap: 0,
          borderRadius: 22,
        }}
      >
        {/* Slide 1: Featured practice */}
        <div style={{ ...slideStyle }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: featuredPractice ? (catColors[featuredPractice.category] || '#CBCBCB') : '#8b5cf6', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6, opacity: 0.9 }}>
              НОВАЯ ПРАКТИКА
            </span>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {featuredPractice ? (featuredPractice.title_ru || featuredPractice.title) : '—'}
            </div>
            <div style={{ fontSize: 12, color: '#CBCBCB', opacity: 0.5, marginBottom: 14 }}>
              {featuredPractice ? `${featuredPractice.instructor_name} · ${Math.floor(featuredPractice.duration_seconds / 60)} мин` : ''}
            </div>
            <button
              onClick={() => featuredPractice && onPracticeClick(featuredPractice)}
              style={ctaBtnStyle}
            >
              Дышать
            </button>
          </div>
          {featuredPractice && (
            <div style={{ flexShrink: 0, borderRadius: 16, overflow: 'hidden' }}>
              <BreathVisual category={featuredPractice.category} size={112} borderRadius={16} animate={true} showBubbles={false} />
            </div>
          )}
        </div>

        {/* Slide 2: Group session */}
        <div style={{ ...slideStyle }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              ГРУППОВАЯ СЕССИЯ
            </span>
            <div style={{ fontSize: 11, color: '#CBCBCB', opacity: 0.4, marginBottom: 4 }}>каждую среду</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 14 }}>
              Дыхание в потоке
            </div>
            <button onClick={onSubscribe} style={ctaBtnStyle}>Подробнее</button>
          </div>
          <div style={{ flexShrink: 0, borderRadius: 16, overflow: 'hidden' }}>
            <BreathVisual category="balance" size={112} borderRadius={16} animate={true} showBubbles={false} />
          </div>
        </div>

        {/* Slide 3: Black CTA slide */}
        <div style={{ ...slideStyle }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, background: 'linear-gradient(90deg,#C034A5,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              ● BLACK
            </span>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 3 }}>
              {isPremium ? 'Вы в [black]' : 'Открой [black]'}
            </div>
            <div style={{ fontSize: 12, color: '#CBCBCB', opacity: 0.5, marginBottom: 14 }}>
              {isPremium ? 'Все практики доступны' : 'больше практик · теория · расписание'}
            </div>
            {!isPremium && (
              <button onClick={onSubscribe} style={ctaBtnStyle}>Узнать больше</button>
            )}
          </div>
          <div style={{ flexShrink: 0, borderRadius: 16, overflow: 'hidden' }}>
            <BreathVisual category="energize" size={112} borderRadius={16} animate={true} showBubbles={false} />
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            onClick={() => scrollTo(i)}
            style={{
              width: activeIdx === i ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: activeIdx === i ? '#fff' : '#313333',
              transition: 'all 0.25s',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  )
}

const slideStyle: React.CSSProperties = {
  flexShrink: 0,
  width: '100%',
  scrollSnapAlign: 'start',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  background: '#0A0A0A',
  border: '1px solid #1A1A1A',
  borderRadius: 22,
  padding: '20px 18px',
  height: 152,
  boxSizing: 'border-box',
}

const ctaBtnStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#000',
  background: '#fff',
  border: 'none',
  borderRadius: 20,
  padding: '7px 18px',
  cursor: 'pointer',
}

// ─── Practices Horizontal Scroll ─────────────────────────────────────────────

function PracticesScroll({
  practices,
  isPremium,
  onPracticeClick,
  onSubscribe,
  catColors,
}: {
  practices: Practice[]
  isPremium: boolean
  onPracticeClick: (p: Practice) => void
  onSubscribe: () => void
  catColors: Record<string, string>
}) {
  return (
    <div
      style={{
        display: 'flex',
        overflowX: 'auto',
        gap: 10,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        paddingBottom: 4,
      }}
    >
      {practices.map(p => {
        const locked = !isPremium && p.is_premium
        const color = catColors[p.category] || '#CBCBCB'
        const mins = Math.floor(p.duration_seconds / 60)
        return (
          <div
            key={p.id}
            onClick={() => locked ? onSubscribe() : onPracticeClick(p)}
            style={{
              flexShrink: 0,
              width: 160,
              background: '#0A0A0A',
              border: '1px solid #1A1A1A',
              borderRadius: 16,
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'relative' }}>
              <BreathVisual category={p.category} size={160} borderRadius={0} animate={false} showBubbles={false} />
              {locked && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C034A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              )}
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                {CAT_DISPLAY[p.category] ?? p.category}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                {p.title_ru || p.title}
              </div>
              <div style={{ fontSize: 11, color: '#CBCBCB', opacity: 0.45 }}>
                {p.instructor_name} · {mins} мин
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Black CTA ────────────────────────────────────────────────────────────────

function BlackCTA({
  lockedPractices,
  onSubscribe,
}: {
  lockedPractices: Practice[]
  onSubscribe: () => void
}) {
  return (
    <div
      onClick={onSubscribe}
      style={{
        background: '#0A0A0A',
        border: '1px solid #1A1A1A',
        borderRadius: 18,
        padding: '18px 18px 20px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,52,165,0.12), transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#C034A5', background: 'rgba(192,52,165,0.1)', borderRadius: 6, padding: '3px 8px', letterSpacing: '0.04em' }}>BLACK</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Ещё {lockedPractices.length > 0 ? `${lockedPractices.length}+` : '6+'} практик</span>
          </div>
          <div style={{ fontSize: 12, color: '#CBCBCB', opacity: 0.5, marginBottom: 14 }}>
            Живые сессии · теория · эксклюзивный контент
          </div>
          <button
            onClick={e => { e.stopPropagation(); onSubscribe() }}
            style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(192,52,165,0.15)', border: '1px solid rgba(192,52,165,0.3)', borderRadius: 20, padding: '8px 18px', cursor: 'pointer' }}
          >
            Открыть [black]
          </button>
        </div>

        {/* Locked previews */}
        {lockedPractices.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {lockedPractices.slice(0, 3).map(p => (
              <div key={p.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                <BreathVisual category={p.category} size={48} borderRadius={10} animate={false} showBubbles={false} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C034A5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
