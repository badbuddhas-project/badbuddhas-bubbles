'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { getLocalDateString } from '@/lib/utils'
import { useUser } from './useUser'
import type { UserStats } from '@/types/database'

export function useUserStats() {
  const { user } = useUser()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats(null)
      setIsLoading(false)
      return
    }

    try {
      const supabase = getSupabaseClient()
      let { data } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Passively reset streak in UI if user missed more than 1 day
      if (data && data.last_practice_date) {
        const today = new Date(getLocalDateString())
        const last = new Date(data.last_practice_date)
        const diffDays = Math.floor(
          (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (diffDays > 1) {
          data = { ...data, current_streak: 0 }
        }
      }

      setStats(data)
    } catch (err) {
      console.error('Failed to fetch user stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    refetch: fetchStats,
  }
}
