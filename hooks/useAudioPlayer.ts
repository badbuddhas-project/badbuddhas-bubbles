'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface UseAudioPlayerOptions {
  onComplete?: () => void
  onProgress?: (currentTime: number, duration: number) => void
}

export function useAudioPlayer(src: string | null, options: UseAudioPlayerOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const optionsRef = useRef(options)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Start/stop interval for time updates
  const startTimeUpdates = useCallback(() => {
    if (intervalRef.current) return

    intervalRef.current = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime)
        optionsRef.current.onProgress?.(
          audioRef.current.currentTime,
          audioRef.current.duration
        )
      }
    }, 100)
  }, [])

  const stopTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Initialize audio element
  useEffect(() => {
    if (!src) {
      setIsLoading(false)
      return
    }

    const audio = new Audio(src)
    audioRef.current = audio

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      stopTimeUpdates()
      setCurrentTime(audio.duration)
      optionsRef.current.onComplete?.()
    }

    const handleError = () => {
      setError('Failed to load audio')
      setIsLoading(false)
      stopTimeUpdates()
    }

    const handleCanPlay = () => {
      setIsLoading(false)
    }

    const handleWaiting = () => {
      setIsLoading(true)
    }

    const handlePlaying = () => {
      setIsLoading(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('playing', handlePlaying)

    return () => {
      stopTimeUpdates()
      audio.pause()
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('playing', handlePlaying)
      audioRef.current = null
    }
  }, [src, stopTimeUpdates])

  const play = useCallback(async () => {
    if (!audioRef.current) return
    try {
      await audioRef.current.play()
      setIsPlaying(true)
      startTimeUpdates()
    } catch (err) {
      console.error('Failed to play:', err)
      setError('Failed to play audio')
    }
  }, [startTimeUpdates])

  const pause = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    setIsPlaying(false)
    stopTimeUpdates()
    // Update time one last time
    setCurrentTime(audioRef.current.currentTime)
  }, [stopTimeUpdates])

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return
    const clampedTime = Math.max(0, Math.min(time, duration))
    audioRef.current.currentTime = clampedTime
    setCurrentTime(clampedTime)
  }, [duration])

  const seekByPercent = useCallback((percent: number) => {
    const time = (percent / 100) * duration
    seek(time)
  }, [duration, seek])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    progress,
    error,
    play,
    pause,
    toggle,
    seek,
    seekByPercent,
  }
}
