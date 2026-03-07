'use client'

/**
 * Hook that tracks onboarding completion state via localStorage.
 */

import { useState, useEffect } from 'react'
import { ONBOARDING_KEY } from '@/lib/constants'

/**
 * @description Reads and writes the onboarding-completed flag from localStorage.
 * `isCompleted` is `null` until the localStorage read resolves (during SSR / first render).
 * @returns `isCompleted`, `isLoading`, `completeOnboarding()`, `resetOnboarding()`.
 */
export function useOnboarding() {
  const [isCompleted, setIsCompleted] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY) === 'true'
    setIsCompleted(completed)
    setIsLoading(false)
  }, [])

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setIsCompleted(true)
  }

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY)
    setIsCompleted(false)
  }

  return {
    isCompleted,
    isLoading,
    completeOnboarding,
    resetOnboarding,
  }
}
