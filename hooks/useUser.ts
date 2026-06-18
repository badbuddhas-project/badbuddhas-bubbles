'use client'

import { useContext } from 'react'
import { AuthContext } from '@/components/AuthProvider'

export function useUser() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useUser must be used within AuthProvider')
  }

  return {
    user: context.user,
    isLoading: context.isLoading,
    isReady: !context.isLoading,
    isTelegram: context.isTelegram,
    signOut: context.logout,
    refreshUser: context.refetchUser,
    // telegramId not exposed here — access TelegramContext directly if needed
  }
}
