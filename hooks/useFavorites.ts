'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useUser } from './useUser'

export function useFavorites() {
  const { user } = useUser()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set())
      setIsLoading(false)
      return
    }

    try {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('favorites')
        .select('practice_id')
        .eq('user_id', user.id)

      if (data) {
        setFavoriteIds(new Set(data.map((f) => f.practice_id)))
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const toggleFavorite = useCallback(
    async (practiceId: string) => {
      if (!user) return

      const supabase = getSupabaseClient()
      const isFavorite = favoriteIds.has(practiceId)

      // Optimistic update
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (isFavorite) {
          next.delete(practiceId)
        } else {
          next.add(practiceId)
        }
        return next
      })

      try {
        if (isFavorite) {
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('practice_id', practiceId)
          if (error) throw error
        } else {
          const { error } = await supabase.from('favorites').insert({
            user_id: user.id,
            practice_id: practiceId,
          })
          if (error) throw error
        }
      } catch (err) {
        console.error('Failed to toggle favorite:', err)
        // Revert on error
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          if (isFavorite) {
            next.add(practiceId)
          } else {
            next.delete(practiceId)
          }
          return next
        })
      }
    },
    [user, favoriteIds]
  )

  const isFavorite = useCallback(
    (practiceId: string) => favoriteIds.has(practiceId),
    [favoriteIds]
  )

  return {
    favoriteIds,
    isLoading,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  }
}
