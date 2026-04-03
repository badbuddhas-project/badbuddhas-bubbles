'use client'

/**
 * Global authentication provider.
 * Handles both Telegram Mini App (initData sync) and browser (JWT cookie) auth flows.
 * Re-validates the session on every route change and redirects unauthenticated users.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isTelegramWebApp, getTelegramUser, expandTelegramApp, closeTelegramApp } from '@/lib/telegram'
import type { User } from '@/types/database'
import { ONBOARDING_KEY } from '@/lib/constants'
import { ymEvent, getPlatform } from '@/lib/analytics'
import { TgSplashScreen } from '@/components/TgSplashScreen'
import EmailGate from '@/components/EmailGate'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isTelegram: boolean
  logout: () => void
  refetchUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

const PUBLIC_ROUTES = ['/login', '/register', '/onboarding', '/auth/', '/forgot-password', '/reset-password', '/subscribe']
const EMAIL_GATE_SKIP_KEY = 'email_gate_shown'

/**
 * @description Root auth provider. Place once at the top of the component tree (app/layout.tsx).
 * Exposes `AuthContext` with `user`, `isLoading`, `isTelegram`, `logout`, and `refetchUser`.
 * @param children - The React subtree to wrap.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTelegram, setIsTelegram] = useState(false)
  const [showEmailGate, setShowEmailGate] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()

  const fetchUser = async () => {
    // ── 1. Telegram Mini App ──────────────────────────────────────────────────
    if (isTelegramWebApp()) {
      setIsTelegram(true)
      expandTelegramApp()
      console.log('[AuthProvider] Detected Telegram Mini App')

      const telegramUser = getTelegramUser()
      console.log('[AuthProvider] TG user:', telegramUser?.id, telegramUser?.username)
      if (telegramUser) {
        try {
          const res = await fetch('/api/auth/telegram-sync', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: telegramUser.id,
              username:    telegramUser.username,
              first_name:  telegramUser.first_name,
            }),
          })

          if (res.ok) {
            const data = await res.json()
            console.log('[AuthProvider] TG sync OK, user:', data.user?.id, 'email:', data.user?.email, 'verified:', data.user?.verified_email)
            setUser(data.user)
            ymEvent('app_opened', { platform: getPlatform(), method: 'telegram' })

            if (data.isNewUser && !localStorage.getItem(ONBOARDING_KEY)) {
              router.push('/onboarding')
            }
          } else {
            console.error('[AuthProvider] TG sync failed:', res.status)
          }
        } catch (e) {
          console.error('[AuthProvider] Telegram sync error:', e)
        }
      }

      setIsLoading(false)
      return
    }

    // ── 2. Browser — check JWT session ────────────────────────────────────────
    console.log('[AuthProvider] Not in Telegram, checking JWT session. pathname:', pathname)
    setIsTelegram(false)

    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        ymEvent('app_opened', { platform: getPlatform(), method: 'email' })
      } else if (pathname && !PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
        const onboardingDone = localStorage.getItem(ONBOARDING_KEY)
        router.push(onboardingDone ? '/login' : '/onboarding')
      }
    } catch (e) {
      console.error('[AuthProvider] Session check error:', e)
    }

    setIsLoading(false)
  }

  // Re-check auth on every route change (guards protected pages)
  useEffect(() => {
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Show EmailGate once per session for TG users without email
  // Skipped on public routes; sessionStorage prevents re-showing after skip/complete
  // Only shown AFTER onboarding is completed to prevent flash before onboarding
  useEffect(() => {
    const isPublic = PUBLIC_ROUTES.some((r) => pathname?.startsWith(r))
    const alreadyHandled = sessionStorage.getItem(EMAIL_GATE_SKIP_KEY)
    const needsEmail = user && !user.email && !user.verified_email
    const onboardingDone = localStorage.getItem(ONBOARDING_KEY) === 'true'

    if (isTelegram && needsEmail && !isPublic && !alreadyHandled && onboardingDone) {
      setShowEmailGate(true)
    } else {
      setShowEmailGate(false)
    }
  }, [user, pathname, isTelegram])

  const logout = async () => {
    if (isTelegram) {
      closeTelegramApp()
    } else {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      window.location.href = '/login'
    }
  }

  const refetchUser = async () => {
    await fetchUser()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isTelegram, logout, refetchUser }}>
      {isLoading && isTelegram ? <TgSplashScreen /> : children}
      {showEmailGate && (
        <EmailGate
          onComplete={(email) => {
            sessionStorage.setItem(EMAIL_GATE_SKIP_KEY, '1')
            setShowEmailGate(false)
            if (user) {
              setUser({ ...user, email, verified_email: email })
            }
          }}
        />
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
