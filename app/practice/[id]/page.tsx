'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { usePracticeCompletion } from '@/hooks/usePracticeCompletion'
import { useFavorites } from '@/hooks/useFavorites'
import { usePractices } from '@/hooks/usePractices'
import { formatDurationFull } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { Practice } from '@/types/database'
import { useUser } from '@/hooks/useUser'
import { ymEvent, getPlatform } from '@/lib/analytics'
import BreathVisual from '@/components/BreathVisual'
import { TabBar } from '@/components/TabBar'

const C = {
  bg: '#000',
  card: '#0A0A0A',
  border: '#1A1A1A',
  white: '#fff',
  text: '#CBCBCB',
  text2: 'rgba(203,203,203,0.5)',
  sub: 'rgba(203,203,203,0.45)',
  slow: '#8b5cf6',
  ground: '#3b82f6',
  rise: '#ec4899',
}

const CAT_COLORS: Record<string, string> = { relax: C.slow, balance: C.ground, energize: C.rise }
const CAT_DISPLAY: Record<string, string> = { relax: 'SLOW', balance: 'GROUND', energize: 'RISE' }

export default function PracticePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const practiceId = params?.id as string
  const fromTab = searchParams?.get('from') || 'home'
  const { t, language } = useTranslation()

  const [mode, setMode] = useState<'detail' | 'player'>('detail')
  const [descExpanded, setDescExpanded] = useState(false)
  const listenedSecondsRef = useRef(0)
  const hasCompletedRef = useRef(false)
  const hasStartedRef = useRef(false)

  const { user } = useUser()
  const isPremium = user?.is_premium ?? false
  const { practices, isLoading: isLoadingPractices } = usePractices()
  const practice = practices.find(p => p.id === practiceId) || null
  const { recordPractice } = usePracticeCompletion()
  const { isFavorite, toggleFavorite } = useFavorites()

  const handleComplete = useCallback(() => {
    if (practice && !hasCompletedRef.current) {
      hasCompletedRef.current = true
      recordPractice(practice.id, Math.floor(listenedSecondsRef.current))
      ymEvent('practice_completed', {
        practice_id: practice.id,
        practice_name: practice.title,
        platform: getPlatform(),
      })
    }
  }, [practice, recordPractice])

  const handleProgress = useCallback((currentTime: number) => {
    listenedSecondsRef.current = currentTime
  }, [])

  const {
    isPlaying,
    isLoading: isAudioLoading,
    currentTime,
    duration,
    progress,
    toggle,
    seek,
    seekByPercent,
  } = useAudioPlayer(practice?.audio_url ?? null, {
    onComplete: handleComplete,
    onProgress: handleProgress,
  })

  const inlineActive = isPlaying || currentTime > 0

  const handleBack = () => {
    if (mode === 'player') {
      setMode('detail')
      return
    }
    if (listenedSecondsRef.current > 10 && !hasCompletedRef.current) {
      ymEvent('practice_abandoned', { practice_id: practiceId, platform: getPlatform() })
    }
    router.back()
  }

  const handlePlay = () => {
    if (practice && !hasStartedRef.current) {
      hasStartedRef.current = true
      ymEvent('practice_started', {
        practice_id: practice.id,
        practice_name: practice.title,
        is_premium: practice.is_premium,
        platform: getPlatform(),
      })
    }
    toggle()
  }

  const handleTogglePlay = () => {
    if (practice && !hasStartedRef.current && !isPlaying) {
      hasStartedRef.current = true
      ymEvent('practice_started', {
        practice_id: practice.id,
        practice_name: practice.title,
        is_premium: practice.is_premium,
        platform: getPlatform(),
      })
    }
    toggle()
  }

  const progressBarRef = useRef<HTMLDivElement>(null)
  const handleProgressSeek = (clientX: number) => {
    const bar = progressBarRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    seekByPercent(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)))
  }
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => handleProgressSeek(e.clientX)
  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => handleProgressSeek(e.touches[0].clientX)

  const handleSeekBack = () => seek(Math.max(0, currentTime - 10))
  const handleSeekForward = () => seek(Math.min(duration, currentTime + 10))

  const mins = practice ? Math.floor(practice.duration_seconds / 60) : 0
  const favorite = practice ? isFavorite(practice.id) : false
  const catColor = practice ? (CAT_COLORS[practice.category] || C.slow) : C.slow

  const morePractices = practices.filter(p => p.id !== practiceId).slice(0, 3)

  // Loading
  if (isLoadingPractices) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#71717a' }}>{t('player.loading')}</div>
      </div>
    )
  }

  // Not found
  if (!practice) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ color: '#71717a' }}>{t('player.notFound')}</div>
        <button onClick={() => router.back()} style={{ color: '#6ee7b7', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
          {t('player.goBack')}
        </button>
      </div>
    )
  }

  const getShareData = () => {
    const duration = practice?.duration_seconds ? `${Math.round(practice.duration_seconds / 60)} мин` : ''
    const shareText = ['Практика breathwork', practice?.title, duration].filter(Boolean).join(' · ')
    const isTest = window.location.hostname.includes('651c7f')
    const botName = isTest ? 'Integration_BadBuddhas_bot' : 'BadBuddhas_bubbles_bot'
    const shortName = isTest ? 'app' : 'breathe'
    const url = `https://t.me/${botName}/${shortName}?startapp=p_${practice?.id}`
    return { text: shareText + '\n' + url }
  }

  // ─── PLAYER MODE (kept for backwards compat) ─────────────────────────────────
  if (mode === 'player') {
    return (
      <main style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: C.bg }}>
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* Top: info + close */}
          <div style={{ padding: '48px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
                {practice.title_ru || practice.title}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>
                {practice.instructor_name}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{mins} мин</div>
            </div>
            <button onClick={handleBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Middle: BreathVisual */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BreathVisual category={practice.category} size={390} borderRadius={0} animate={true} showBubbles={false} />
            </div>
          </div>

          {/* Bottom: progress + controls */}
          <div style={{ padding: '0 20px 36px' }}>
            <div style={{ padding: '20px 0', cursor: 'pointer', marginBottom: -14 }} onClick={handleProgressClick} onTouchStart={handleProgressTouch}>
              <div ref={progressBarRef} style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{formatDurationFull(Math.floor(currentTime))}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{formatDurationFull(Math.floor(duration))}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
              {/* -10s */}
              <button onClick={handleSeekBack} style={{ padding: 4, cursor: 'pointer', position: 'relative', background: 'none', border: 'none' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5">
                  <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>10</span>
              </button>

              {/* Play/Pause */}
              <button onClick={handleTogglePlay} disabled={isAudioLoading} style={{ width: 56, height: 56, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'none', opacity: isAudioLoading ? 0.5 : 1 }}>
                {isAudioLoading ? (
                  <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                ) : isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M8 5.14v14l11-7-11-7z" /></svg>
                )}
              </button>

              {/* +10s */}
              <button onClick={handleSeekForward} style={{ padding: 4, cursor: 'pointer', position: 'relative', background: 'none', border: 'none' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5">
                  <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>10</span>
              </button>

              {/* Favorite */}
              <button onClick={() => toggleFavorite(practice.id)} style={{ padding: 4, cursor: 'pointer', background: 'none', border: 'none' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={favorite ? 'rgba(255,255,255,0.45)' : 'none'} stroke="rgba(255,255,255,0.45)" strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>

              {/* Share */}
              <button onClick={() => navigator.share?.(getShareData()).catch(() => {})} style={{ padding: 4, cursor: 'pointer', background: 'none', border: 'none' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ─── DETAIL MODE ─────────────────────────────────────────────────────────────
  const description = practice?.description || ''

  return (
    <main style={{ minHeight: '100vh', background: C.bg, overflowY: 'auto', paddingBottom: 80 }}>

      {/* Back button — absolute over hero */}
      <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 20 }}>
        <button onClick={handleBack} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CBCBCB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      </div>

      {/* Hero — full-width BreathVisual */}
      <div style={{ width: '100%', position: 'relative' }}>
        <div style={{ width: '100%', overflow: 'hidden', lineHeight: 0 }}>
          <BreathVisual category={practice.category} size={390} borderRadius={0} animate={isPlaying} showBubbles={false} />
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: `linear-gradient(to bottom, transparent 0%, ${C.bg} 100%)` }} />
      </div>

      {/* ─── Inline player controls (always in DOM, animated via CSS) ─── */}
      <div
        style={{
          maxHeight: inlineActive ? 120 : 0,
          opacity: inlineActive ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease',
          padding: inlineActive ? '0 20px 8px' : '0 20px',
        }}
      >
        {/* Progress bar */}
        <div
          style={{ padding: '10px 0', cursor: 'pointer' }}
          onClick={handleProgressClick}
          onTouchStart={handleProgressTouch}
        >
          <div
            ref={progressBarRef}
            style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, position: 'relative' }}
          >
            <div style={{ width: `${progress}%`, height: '100%', background: catColor, borderRadius: 2 }} />
            {/* Thumb */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: `${progress}%`,
              transform: 'translate(-50%, -50%)',
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: catColor,
              boxShadow: `0 0 4px ${catColor}`,
            }} />
          </div>
        </div>

        {/* Time + controls row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', minWidth: 38 }}>
            {formatDurationFull(Math.floor(currentTime))}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* -10s */}
            <button onClick={handleSeekBack} style={{ padding: 4, cursor: 'pointer', position: 'relative', background: 'none', border: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5">
                <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>10</span>
            </button>

            {/* Play/Pause — outlined style */}
            <button onClick={handleTogglePlay} disabled={isAudioLoading} style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: 'none',
              opacity: isAudioLoading ? 0.5 : 1,
            }}>
              {isAudioLoading ? (
                <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
              ) : isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M8 5.14v14l11-7-11-7z" /></svg>
              )}
            </button>

            {/* +10s */}
            <button onClick={handleSeekForward} style={{ padding: 4, cursor: 'pointer', position: 'relative', background: 'none', border: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5">
                <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>10</span>
            </button>
          </div>

          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', minWidth: 38, textAlign: 'right' }}>
            {formatDurationFull(Math.floor(duration))}
          </span>
        </div>
      </div>

      {/* Info section */}
      <div style={{ padding: '0 20px 24px', marginTop: 16 }}>

        {/* Title row + actions */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.white, marginBottom: 3 }}>
              {practice.title_ru || practice.title}
            </div>
            <div style={{ fontSize: 12, color: C.sub }}>
              {practice.instructor_name} · {mins} мин · {CAT_DISPLAY[practice.category] ?? practice.category}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 4, flexShrink: 0 }}>
            {/* Share */}
            <button onClick={() => navigator.share?.(getShareData()).catch(() => {})} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="1.8"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
            </button>
            {/* Favorite */}
            <button onClick={() => toggleFavorite(practice.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={favorite ? C.sub : 'none'} stroke={C.sub} strokeWidth="1.8">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            {/* Play button — always visible */}
            <button onClick={handlePlay} style={{
              width: 46, height: 46, borderRadius: '50%',
              background: isPlaying ? catColor : 'rgba(255,255,255,0.85)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.3s ease',
            }}>
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill={C.bg}><path d="M8 5.14v14l11-7-11-7z" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* About section */}
        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
            {language === 'ru' ? 'О ПРАКТИКЕ' : 'ABOUT'}
          </div>
          <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.65, margin: 0 }}>
            {descExpanded ? description : description.slice(0, 100) + (description.length > 100 ? '...' : '')}
          </p>
          {description.length > 100 && !descExpanded && (
            <button onClick={() => setDescExpanded(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: catColor, padding: '8px 0' }}>
              {language === 'ru' ? 'Ещё...' : 'More...'}
            </button>
          )}
        </div>

        {/* Divider + More practices */}
        {morePractices.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
              {language === 'ru' ? 'ЕЩЁ ПРАКТИКИ' : 'MORE PRACTICES'}
            </div>
            {morePractices.map(rp => {
              const rpMins = Math.floor(rp.duration_seconds / 60)
              const rpCatColor = CAT_COLORS[rp.category] || C.slow
              const rpLocked = !isPremium && rp.is_premium
              return (
                <div
                  key={rp.id}
                  onClick={() => router.push(rpLocked ? '/subscribe' : `/practice/${rp.id}?from=${fromTab}`)}
                  style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                    <BreathVisual category={rp.category} size={64} borderRadius={12} animate={false} showBubbles={false} />
                    {rpLocked && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C034A5" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                      {rp.title_ru || rp.title}
                    </div>
                    <div style={{ fontSize: 11, color: C.sub }}>
                      <span style={{ color: rpCatColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, fontSize: 9 }}>
                        {CAT_DISPLAY[rp.category] ?? rp.category}
                      </span>
                      {' · '}{rpMins} мин · {rp.instructor_name}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <TabBar isPremium={isPremium} activeOverride={fromTab} />
    </main>
  )
}
