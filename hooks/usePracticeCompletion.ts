'use client'

import { useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
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

        // Recompute streak + stats authoritatively from practice history
        // (fixed Europe/Moscow timezone) on the server. Idempotent: a dropped
        // call self-heals on the next practice instead of corrupting the streak.
        const { data: newStreak, error } = await supabase.rpc('recalc_user_streak', {
          p_user_id: user.id,
        })

        if (error) throw error

        ymEvent('streak_updated', { streak_days: newStreak ?? 0, platform: getPlatform() })

      } catch (err) {
        console.error('Failed to record practice:', err)
      }
    },
    [user]
  )

  return { recordPractice }
}
