'use client'

import { useContext } from 'react'
import { AuthContext } from '@/components/AuthProvider'

export function useUser() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useUser must be used within AuthProvider')
  }

  const { user } = context

  const trialEndsAt = user?.trial_ends_at ? new Date(user.trial_ends_at) : null
  const now = new Date()
  const trialActive = trialEndsAt !== null && trialEndsAt > now
  const trialDaysLeft = trialActive
    ? Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const hasAccess = (user?.is_premium ?? false) || trialActive

  return {
    user,
    isLoading: context.isLoading,
    isReady: !context.isLoading,
    isTelegram: context.isTelegram,
    signOut: context.logout,
    refreshUser: context.refetchUser,
    hasAccess,
    trialDaysLeft,
  }
}
