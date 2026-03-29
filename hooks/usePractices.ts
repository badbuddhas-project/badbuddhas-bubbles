'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import type { Practice, PracticeCategory } from '@/types/database'

interface UsePracticesOptions {
  category?: PracticeCategory | 'all' | 'premium'
}

export function usePractices(options: UsePracticesOptions = {}) {
  const { user } = useUser()
  const [practices, setPractices] = useState<Practice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPractices = useCallback(async () => {
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

      setPractices(data || [])
    } catch (err) {
      console.error('Failed to fetch practices:', err)
      setError('Failed to load practices')
    } finally {
      setIsLoading(false)
    }
  }, [options.category])

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
