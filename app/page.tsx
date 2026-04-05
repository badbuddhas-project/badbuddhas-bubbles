'use client'

/**
 * Home screen — per docs/badbuddhas-redesign-mockup-black.jsx HomeScreen (lines 674-868)
 * EnergyBlob/BlobPreview → BreathVisual
 */

import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { usePractices } from '@/hooks/usePractices'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useTranslation } from '@/lib/i18n'
import BreathVisual from '@/components/BreathVisual'
import { BrandMark } from '@/components/BrandMark'
import { TabBar } from '@/components/TabBar'
import type { Practice } from '@/types/database'
import { ymEvent, getPlatform } from '@/lib/analytics'

const C = {
  bg: '#000',
  card: '#0A0A0A',
  border: '#1A1A1A',
  border2: '#222',
  white: '#fff',
  text: '#CBCBCB',
  text2: 'rgba(203,203,203,0.5)',
  sub: 'rgba(203,203,203,0.45)',
  slow: '#8b5cf6',
  ground: '#3b82f6',
  rise: '#ec4899',
  pink: '#C034A5',
  green: '#54C68C',
}

const CAT_COLORS: Record<string, string> = { relax: C.slow, balance: C.ground, energize: C.rise }
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

  const [slide, setSlide] = useState(0)
  const touchStartX = useRef(0)
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const slideCountRef = useRef(2)

  const resetAutoRotate = useCallback(() => {
    if (autoTimer.current) clearInterval(autoTimer.current)
    if (slideCountRef.current <= 1) return
    autoTimer.current = setInterval(() => {
      setSlide(prev => (prev + 1) % slideCountRef.current)
    }, 7000)
  }, [])

  useEffect(() => {
    resetAutoRotate()
    return () => { if (autoTimer.current) clearInterval(autoTimer.current) }
  }, [resetAutoRotate])

  useEffect(() => { ymEvent('app_opened', { platform: getPlatform() }) }, [])

  useEffect(() => {
    if (!isOnboardingLoading && !isOnboardingCompleted) router.replace('/onboarding')
  }, [isOnboardingCompleted, isOnboardingLoading, router])

  useEffect(() => {
    const tgStartParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param
    if (tgStartParam === 'activate' && !user?.is_premium && !sessionStorage.getItem('activate_handled')) {
      sessionStorage.setItem('activate_handled', '1')
      router.push('/subscribe?step=activate')
    }
  }, [router, user?.is_premium])

  useEffect(() => {
    if (!isPracticesLoading && practices.length > 0) ymEvent('practice_list_viewed', { platform: getPlatform() })
  }, [isPracticesLoading, practices.length])

  const isPremium = user?.is_premium ?? false
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  useEffect(() => {
    if (!isPremium || !user) return
    const tgId = user.telegram_id ? `?telegram_id=${user.telegram_id}` : ''
    fetch(`/api/subscriptions/me${tgId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.expires_at) setExpiresAt(d.expires_at) })
      .catch(() => {})
  }, [isPremium, user])

  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
  const showRenewal = isPremium && daysLeft !== null && daysLeft <= 3
  const showBlackPromo = !isPremium

  const freePractices = useMemo(() => practices.filter(p => !p.is_premium).slice(0, 3), [practices])


  const teachers = useMemo(() => {
    const seen = new Set<string>()
    return practices
      .filter(p => { if (seen.has(p.instructor_name)) return false; seen.add(p.instructor_name); return true })
      .map(p => ({
        name: p.instructor_name,
        avatarUrl: p.instructor_avatar_url,
        category: p.category,
        count: practices.filter(x => x.instructor_name === p.instructor_name).length,
      }))
  }, [practices])

  const handlePractice = (p: Practice) => {
    if (!isPremium && p.is_premium) router.push('/subscribe')
    else router.push(`/practice/${p.id}?from=home`)
  }


  if (isUserLoading || isOnboardingLoading || !isOnboardingCompleted) {
    return (
      <main style={{ height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </main>
    )
  }

  const greeting = `${t('catalog.hi')} ${user?.first_name || (language === 'en' ? 'breather' : 'дышатель')}`

  const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

  const SLIDES: { key: string; content: ReactNode }[] = []

  if (showRenewal) {
    SLIDES.push({
      key: 'renewal',
      content: (
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden', borderRadius: 22 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a0030, #2d0050)' }} />
          <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,52,165,0.5) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: 20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(84,198,140,0.25) 0%, transparent 65%)' }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 18px' }}>
            <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, #C034A5, #7b1fa2)', borderRadius: 20, padding: '3px 12px', marginBottom: 10, alignSelf: 'flex-start' }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: 2 }}>BLACK</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Подписка заканчивается</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 12 }}>{`Осталось ${daysLeft} дн. · до ${expiryDate}`}</div>
            <button onClick={() => router.push('/subscribe')} style={{ width: '100%', background: 'linear-gradient(135deg, #C034A5, #7b1fa2)', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 14, padding: '11px', border: 'none', cursor: 'pointer' }}>
              Продлить доступ
            </button>
          </div>
        </div>
      ),
    })
  } else if (showBlackPromo) {
    SLIDES.push({
      key: 'black',
      content: (
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden', borderRadius: 22 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a0030, #2d0050)' }} />
          <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,52,165,0.5) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: 20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(84,198,140,0.25) 0%, transparent 65%)' }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 18px' }}>
            <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, #C034A5, #7b1fa2)', borderRadius: 20, padding: '3px 12px', marginBottom: 10, alignSelf: 'flex-start' }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: 2 }}>BLACK</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Ещё 30+ практик</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 12 }}>Живые сессии, теория и эксклюзивный контент</div>
            <button onClick={() => router.push('/subscribe')} style={{ width: '100%', background: 'linear-gradient(135deg, #C034A5, #7b1fa2)', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 14, padding: '11px', border: 'none', cursor: 'pointer' }}>
              Открыть [black]
            </button>
          </div>
        </div>
      ),
    })
  }

  if (!showRenewal) {
    SLIDES.push({
      key: 'group',
      content: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 7 }}>ГРУППОВАЯ СЕССИЯ</div>
            <div style={{ fontSize: 28, fontWeight: 500, color: C.white, marginBottom: 1 }}>28.05</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 3 }}>MEGA breathwork</div>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 13 }}>с Дашей Чен</div>
            <button onClick={() => router.push('/subscribe')} style={{ fontSize: 12, fontWeight: 600, color: C.bg, background: C.green, border: 'none', borderRadius: 20, padding: '7px 16px', cursor: 'pointer' }}>Подробнее →</button>
          </div>
          <div style={{ flexShrink: 0, borderRadius: 22, overflow: 'hidden' }}>
            <BreathVisual category="balance" size={112} borderRadius={22} animate={true} showBubbles={false} />
          </div>
        </div>
      ),
    })
  }

  slideCountRef.current = SLIDES.length

  return (
    <div style={{ overflowY: 'auto', minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '44px 16px 12px' }}>
        <BrandMark size={18} />
        <button
          onClick={() => router.push('/profile')}
          style={{ width: 44, height: 44, borderRadius: '50%', background: C.card, border: `1.5px solid ${C.border2}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      </div>

      {/* Greeting */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{greeting}</div>
        <div style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af', marginTop: 2 }}>[{t('catalog.letsBreath')}]</div>
      </div>

      {/* Hero Carousel */}
      <div style={{ padding: '0 16px', marginBottom: 26 }}>
        <div
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const diff = touchStartX.current - e.changedTouches[0].clientX
            if (Math.abs(diff) > 50) {
              if (diff > 0) setSlide(prev => Math.min(prev + 1, SLIDES.length - 1))
              else setSlide(prev => Math.max(prev - 1, 0))
              resetAutoRotate()
            }
          }}
          style={{ borderRadius: 22, height: 200, overflow: 'hidden' }}
        >
          <div style={{
            display: 'flex',
            transform: `translateX(-${slide * 100}%)`,
            transition: 'transform 0.5s ease-in-out',
            height: '100%',
          }}>
            {SLIDES.map((s, i) => (
              <div key={s.key} style={{
                flexShrink: 0,
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                borderRadius: 22,
                overflow: 'hidden',
                ...(s.key === 'black'
                  ? { background: 'transparent', border: 'none', padding: 0 }
                  : { background: C.card, border: `1px solid ${C.border}`, padding: '20px 18px' }),
              }}>
                {s.content}
              </div>
            ))}
          </div>
        </div>
        {SLIDES.length > 1 && <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setSlide(i); resetAutoRotate() }}
              style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3, background: i === slide ? C.text2 : C.border2, border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.25s ease' }}
            />
          ))}
        </div>}
      </div>

      {/* Practices section */}
      <div style={{ padding: '0 16px', marginBottom: 20 }}>
        <SectionHdr title="Практики" onAll={() => router.push('/catalog')} />
        {isPracticesLoading ? (
          <div style={{ display: 'flex', gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ width: 160, height: 220, flexShrink: 0, borderRadius: 18, background: C.card }} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {freePractices.map(p => (
              <HomeCard key={p.id} p={p} onTap={() => handlePractice(p)} locked={false} />
            ))}
          </div>
        )}
      </div>

      {/* Teachers section */}
      {teachers.length > 0 && (
        <div style={{ padding: '0 16px', marginBottom: 20 }}>
          <SectionHdr title="Преподаватели" />
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {teachers.map((teacher, idx) => {
              const isLocked = !isPremium && idx > 0
              return (
                <div
                  key={teacher.name}
                  onClick={() => { if (!isLocked) router.push(`/catalog?instructor=${encodeURIComponent(teacher.name)}`) }}
                  style={{ flexShrink: 0, textAlign: 'center', width: 90, opacity: isLocked ? 0.3 : 1, cursor: isLocked ? 'default' : 'pointer' }}
                >
                  <div style={{ width: 90, height: 90, borderRadius: 18, marginBottom: 8, overflow: 'hidden', position: 'relative', border: `1px solid ${C.border}` }}>
                    {teacher.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={teacher.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.1) brightness(0.8)' }} />
                    ) : (
                      <div style={{ filter: 'grayscale(100%) brightness(0.7)' }}>
                        <BreathVisual category={teacher.category} size={90} borderRadius={0} animate={false} showBubbles={false} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.72) 100%)' }} />
                    <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>{teacher.name.split(' ')[0]}</span>
                    </div>
                    {isLocked && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    <span style={{ fontSize: 10, color: C.sub }}>{teacher.count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <TabBar isPremium={isPremium} />
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHdr({ title, onAll }: { title: string; onAll?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: '#CBCBCB' }}>{title}</span>
      {onAll && (
        <button onClick={onAll} style={{ fontSize: 11, fontWeight: 600, color: '#CBCBCB', opacity: 0.45, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}>
          ВСЕ →
        </button>
      )}
    </div>
  )
}

// ─── Home Practice Card (square, full-bleed visual) ───────────────────────────

function HomeCard({ p, onTap, locked }: { p: Practice; onTap: () => void; locked: boolean }) {
  const catColor = ({ relax: '#8b5cf6', slow: '#8b5cf6', balance: '#3b82f6', ground: '#3b82f6', energize: '#ec4899', rise: '#ec4899' } as Record<string, string>)[p.category] || '#8b5cf6'
  const mins = Math.floor(p.duration_seconds / 60)
  return (
    <div
      onClick={onTap}
      style={{ flexShrink: 0, width: 120, cursor: 'pointer', borderRadius: 16, overflow: 'hidden', position: 'relative', border: `1px solid #1A1A1A` }}
    >
      <BreathVisual category={p.category} size={120} borderRadius={16} animate={true} showBubbles={false} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.82) 100%)', zIndex: 1 }} />
      {locked && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C034A5" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        </div>
      )}
      {!locked && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <svg width="14" height="14" viewBox="0 0 12 14" fill="white"><path d="M1 1.5l10 5-10 5V1.5z"/></svg>
        </div>
      )}
      {/* Category tag — top left */}
      <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, fontSize: 9, fontWeight: 700, color: catColor, textTransform: 'uppercase', letterSpacing: 1 }}>
        {CAT_DISPLAY[p.category] ?? p.category}
      </span>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px', zIndex: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.title_ru || p.title}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{mins} мин</div>
      </div>
    </div>
  )
}
