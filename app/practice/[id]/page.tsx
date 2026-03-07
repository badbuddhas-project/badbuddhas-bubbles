'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { usePracticeCompletion } from '@/hooks/usePracticeCompletion'
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
    // Record partial listen if played for more than 10 seconds
    if (listenedSecondsRef.current > 10 && !hasCompletedRef.current) {
      recordPractice(practiceId, Math.floor(listenedSecondsRef.current))
      ymEvent('practice_abandoned', { practice_id: practiceId, platform: getPlatform() })
    }
    router.back()
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = ((e.clientX - rect.left) / rect.width) * 100
    seekByPercent(percent)
  }

  const remainingTime = duration - currentTime

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
    <main className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 animated-gradient" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center p-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <ArrowLeftIcon className="w-6 h-6 text-emerald-300" />
          </button>
        </header>

        {/* Practice info */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            {practice.title_ru || practice.title}
          </h1>
          <p className="text-zinc-400">{practice.instructor_name}</p>
        </div>

        {/* Player controls */}
        <div className="p-6 pb-12">
          {/* Progress bar */}
          <div
            className="h-1 bg-zinc-700 rounded-full mb-4 cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-emerald-300 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Time display */}
          <div className="flex justify-between text-sm text-zinc-400 mb-8">
            <span>{formatDurationFull(Math.floor(currentTime))}</span>
            <span>-{formatDurationFull(Math.floor(remainingTime))}</span>
          </div>

          {/* Play/Pause button */}
          <div className="flex justify-center">
            <button
              onClick={() => {
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
              }}
              disabled={isAudioLoading}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform disabled:opacity-50"
            >
              {isAudioLoading ? (
                <LoadingSpinner className="w-8 h-8 text-black" />
              ) : isPlaying ? (
                <PauseIcon className="w-8 h-8 text-black" />
              ) : (
                <PlayIcon className="w-8 h-8 text-black ml-1" />
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animated-gradient {
          background: linear-gradient(
            135deg,
            #8B5CF6 0%,
            #EC4899 25%,
            #000000 50%,
            #8B5CF6 75%,
            #EC4899 100%
          );
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </main>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
