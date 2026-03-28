'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { usePracticeCompletion } from '@/hooks/usePracticeCompletion'
import { useFavorites } from '@/hooks/useFavorites'
import { formatDurationFull } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { Practice } from '@/types/database'
import { ymEvent, getPlatform } from '@/lib/analytics'


export default function PracticePage() {
  const params = useParams()
  const router = useRouter()
  const practiceId = params?.id as string
  const { t } = useTranslation()

  const [practice, setPractice] = useState<Practice | null>(null)
  const [isLoadingPractice, setIsLoadingPractice] = useState(true)
  const listenedSecondsRef = useRef(0)
  const hasCompletedRef = useRef(false)
  const hasStartedRef = useRef(false)

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

  useEffect(() => {
    const fetchPractice = async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('practices')
        .select('*')
        .eq('is_visible', true)
        .eq('id', practiceId)
        .single()

      if (data) {
        setPractice(data)
      }
      setIsLoadingPractice(false)
    }

    fetchPractice()
  }, [practiceId])

  const handleBack = () => {
    if (listenedSecondsRef.current > 10 && !hasCompletedRef.current) {
      ymEvent('practice_abandoned', { practice_id: practiceId, platform: getPlatform() })
    }
    router.back()
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = ((e.clientX - rect.left) / rect.width) * 100
    seekByPercent(percent)
  }

  const handleSeekBack = () => {
    seek(Math.max(0, currentTime - 10))
  }

  const handleSeekForward = () => {
    seek(Math.min(duration, currentTime + 10))
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

  const mins = practice ? Math.floor(practice.duration_seconds / 60) : 0
  const favorite = practice ? isFavorite(practice.id) : false

  const playerCanvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = playerCanvasRef.current
    if (!el || typeof window === 'undefined') return

    const col = { main: [59, 130, 246] as [number,number,number], bg: [3, 6, 20] as [number,number,number] }
    const [mr, mg, mb] = col.main

    const W = 780, H = 1440
    const src = document.createElement('canvas')
    src.width = W; src.height = H
    const ctx = src.getContext('2d')!
    const cx = W / 2, cy = H * 0.44, S = Math.min(W, H * 0.55)

    let seed = 42
    const sr = () => { let x = Math.sin(seed++) * 10000; return x - Math.floor(x) }
    const wob = [
      Array.from({ length: 6 }, () => (sr() - 0.5) * 2),
      Array.from({ length: 8 }, () => (sr() - 0.5) * 2),
      Array.from({ length: 5 }, () => (sr() - 0.5) * 2),
    ]
    const layers = [
      { R: S * 0.36, wc: 6, wa: 0.07, alpha: 0.85, lw: 0.011, wi: 0 },
      { R: S * 0.28, wc: 8, wa: 0.05, alpha: 0.50, lw: 0.007, wi: 1 },
      { R: S * 0.19, wc: 5, wa: 0.09, alpha: 0.30, lw: 0.005, wi: 2 },
    ]

    const myCanvas = document.createElement('canvas')
    myCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'
    el.appendChild(myCanvas)
    const myCtx = myCanvas.getContext('2d')!

    let raf: number
    function draw(ts: number) {
      const T = ts * 0.001
      const bs = 1 + 0.1 * Math.sin(T * (Math.PI * 2 / 7))

      ctx.fillStyle = `rgb(${col.bg[0]},${col.bg[1]},${col.bg[2]})`
      ctx.fillRect(0, 0, W, H)
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.9)
      grd.addColorStop(0, `rgba(${mr},${mg},${mb},0.07)`)
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H)

      ctx.globalCompositeOperation = 'lighter'
      layers.forEach(layer => {
        const r = layer.R * bs, wb = wob[layer.wi], steps = 150
        ctx.beginPath()
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2
          let w = 0
          for (let k = 0; k < layer.wc; k++) w += wb[k % wb.length] * Math.sin(a * (k + 1) + T * (0.14 + k * 0.04)) * layer.wa
          const rr = r * (1 + w), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.strokeStyle = `rgba(${mr},${mg},${mb},${layer.alpha * 0.1})`
        ctx.lineWidth = S * layer.lw * 3; ctx.stroke()
        ctx.strokeStyle = `rgba(${mr},${mg},${mb},${layer.alpha})`
        ctx.lineWidth = S * layer.lw; ctx.stroke()
        const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        fg.addColorStop(0, `rgba(${mr},${mg},${mb},${0.06 * layer.alpha})`)
        fg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H)
      })

      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.09)
      cg.addColorStop(0, 'rgba(255,255,255,0.85)')
      cg.addColorStop(0.4, `rgba(${mr},${mg},${mb},0.4)`)
      cg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'source-over'

      const ef = ctx.createRadialGradient(cx, cy, S * 0.5, cx, cy, S * 0.8)
      ef.addColorStop(0, 'rgba(0,0,0,0)')
      ef.addColorStop(1, `rgba(${col.bg[0]},${col.bg[1]},${col.bg[2]},0.96)`)
      ctx.fillStyle = ef; ctx.fillRect(0, 0, W, H)

      myCanvas.width = el!.offsetWidth || 390
      myCanvas.height = el!.offsetHeight || 720
      myCtx.drawImage(src, 0, 0, W, H, 0, 0, myCanvas.width, myCanvas.height)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      if (el.contains(myCanvas)) el.removeChild(myCanvas)
    }
  }, [])

  if (isLoadingPractice) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500">{t('player.loading')}</div>
      </div>
    )
  }

  if (!practice) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-zinc-500">{t('player.notFound')}</div>
        <button
          onClick={() => router.back()}
          className="text-emerald-300 underline"
        >
          {t('player.goBack')}
        </button>
      </div>
    )
  }

  return (
    <main style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: 'rgb(3,6,20)' }}>
      {/* Canvas animation layer */}
      <div
        ref={playerCanvasRef}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      />

      {/* Content column */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Top: info left, close right */}
      <div style={{
        padding: '48px 20px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
            {practice.title_ru || practice.title}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>
            {practice.instructor_name}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            {mins} мин
          </div>
        </div>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Middle: visual space for canvas animation */}
      <div style={{ flex: 1 }} />

      {/* Bottom: progress + timer + controls */}
      <div style={{
        padding: '0 20px 36px',
      }}>
        {/* Progress bar */}
        <div style={{ marginBottom: 6 }}>
          <div
            style={{ padding: '12px 0', margin: '-12px 0', cursor: 'pointer' }}
            onClick={handleProgressClick}
          >
            <div
              style={{ height: 2, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}
            >
              <div style={{ width: `${progress}%`, height: '100%', background: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
            </div>
          </div>
        </div>

        {/* Timer — right-aligned, current time only */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {formatDurationFull(Math.floor(currentTime))}
          </span>
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          {/* Rewind -10s */}
          <button onClick={handleSeekBack} style={{ padding: 4, cursor: 'pointer', position: 'relative', background: 'none', border: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5">
              <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
            }}>10</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={handleTogglePlay}
            disabled={isAudioLoading}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: 'none',
              opacity: isAudioLoading ? 0.5 : 1,
            }}
          >
            {isAudioLoading ? (
              <svg style={{ animation: 'spin 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle opacity="0.25" cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.8)" strokeWidth="4" />
                <path opacity="0.75" fill="rgba(255,255,255,0.8)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)">
                <path d="M8 5.14v14l11-7-11-7z" />
              </svg>
            )}
          </button>

          {/* Forward +10s */}
          <button onClick={handleSeekForward} style={{ padding: 4, cursor: 'pointer', position: 'relative', background: 'none', border: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5">
              <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
            }}>10</span>
          </button>

          {/* Favorite */}
          <button
            onClick={() => toggleFavorite(practice.id)}
            style={{ padding: 4, cursor: 'pointer', background: 'none', border: 'none' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={favorite ? 'rgba(255,255,255,0.45)' : 'none'} stroke="rgba(255,255,255,0.45)" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </div>

      </div>{/* end content column */}

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
