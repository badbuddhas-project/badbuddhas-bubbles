'use client'

import { useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { getLocalDateString } from '@/lib/utils'
import { useUser } from './useUser'
import { ymEvent, getPlatform } from '@/lib/analytics'

export function usePracticeCompletion() {
  const { user } = useUser()

  const recordPractice = useCallback(
    async (practiceId: string, listenedSeconds: number) => {
      if (!user) return

      const supabase = getSupabaseClient()

      try {
        // Record the practice session
        await supabase.from('user_practices').insert({
          user_id: user.id,
          practice_id: practiceId,
          listened_seconds: listenedSeconds,
        })

        // Get current stats
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (!stats) return

        const today = getLocalDateString()
        const lastPracticeDate = stats.last_practice_date
        const minutesListened = Math.floor(listenedSeconds / 60)

        let newStreak = stats.current_streak
        let newLongestStreak = stats.longest_streak

        if (lastPracticeDate) {
          const lastDate = new Date(lastPracticeDate)
          const todayDate = new Date(today)
          const diffDays = Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (diffDays === 1) {
            // Consecutive day - increase streak
            newStreak += 1
          } else if (diffDays > 1) {
            // Streak broken - reset to 1
            newStreak = 1
          }
          // diffDays === 0: same day, keep streak
        } else {
          // First practice ever
          newStreak = 1
        }

        // Update longest streak if needed
        if (newStreak > newLongestStreak) {
          newLongestStreak = newStreak
        }

        // Update stats
        await supabase
          .from('user_stats')
          .update({
            current_streak: newStreak,
            longest_streak: newLongestStreak,
            total_practices: stats.total_practices + 1,
            total_minutes: stats.total_minutes + minutesListened,
            last_practice_date: today,
          })
          .eq('user_id', user.id)

        ymEvent('streak_updated', { streak_days: newStreak, platform: getPlatform() })

      } catch (err) {
        console.error('Failed to record practice:', err)
      }
    },
    [user]
  )

  return { recordPractice }
}
