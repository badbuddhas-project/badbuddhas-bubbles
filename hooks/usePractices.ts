'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import type { Practice, PracticeCategory } from '@/types/database'

interface UsePracticesOptions {
  category?: PracticeCategory | 'all' | 'premium'
}

// In-memory cache
let cachedPractices: Record<string, Practice[]> = {}
let cacheTimes: Record<string, number> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function usePractices(options: UsePracticesOptions = {}) {
  const { user } = useUser()
  const [practices, setPractices] = useState<Practice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cacheKey = options.category || 'all'

  const fetchPractices = useCallback(async () => {
    const now = Date.now()
    const cached = cachedPractices[cacheKey]
    const cacheTime = cacheTimes[cacheKey] || 0

    if (cached && (now - cacheTime) < CACHE_TTL) {
      setPractices(cached)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()
      let query = supabase
        .from('practices')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true })

      if (options.category && options.category !== 'all') {
        if (options.category === 'premium') {
          query = query.eq('is_premium', true)
        } else {
          query = query.eq('category', options.category)
        }
      }

      const { data, error: queryError } = await query

      if (queryError) {
        throw queryError
      }

      const result = data || []
      cachedPractices[cacheKey] = result
      cacheTimes[cacheKey] = Date.now()
      setPractices(result)
    } catch (err) {
      console.error('Failed to fetch practices:', err)
      setError('Failed to load practices')
    } finally {
      setIsLoading(false)
    }
  }, [options.category, cacheKey])

  useEffect(() => {
    if (!user) return
    fetchPractices()
  }, [user, fetchPractices])

  return {
    practices,
    isLoading,
    error,
    refetch: fetchPractices,
  }
}
