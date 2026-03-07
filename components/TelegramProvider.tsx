'use client'

import { createContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { isTelegramWebApp, expandTelegramApp } from '@/lib/telegram'
import type { User } from '@/types/database'

interface TelegramContextType {
  isReady: boolean
  isLoading: boolean
  user: User | null
  telegramId: number | null
  refreshUser: () => Promise<void>
}

export const TelegramContext = createContext<TelegramContextType | null>(null)

interface TelegramProviderProps {
  children: ReactNode
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [telegramId, setTelegramId] = useState<number | null>(null)

  const refreshUser = useCallback(async () => {
    if (!telegramId) return
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single()
    if (data) setUser(data)
  }, [telegramId])

  useEffect(() => {
    const initTelegram = async () => {
      // Not in Telegram — skip SDK entirely and resolve immediately.
      // This prevents the "Unable to retrieve launch parameters" error
      // that @telegram-apps/sdk throws in regular browsers.
      if (!isTelegramWebApp()) {
        setIsReady(true)
        setIsLoading(false)
        return
      }

      // Expand immediately using the raw WebApp API — before the SDK loads —
      // so the app goes full-screen as fast as possible.
      expandTelegramApp()

      try {
        // Dynamic import — SDK bundle is only fetched when inside Telegram,
        // so browser users never download or execute it.
        const { init, miniApp, themeParams, initData, viewport } =
          await import('@telegram-apps/sdk')

        init()

        if (viewport.mount.isAvailable()) viewport.mount()
        if (viewport.expand.isAvailable()) viewport.expand()
        if (miniApp.mount.isAvailable()) miniApp.mount()
        if (miniApp.setHeaderColor.isAvailable()) miniApp.setHeaderColor('#000000')
        if (miniApp.setBackgroundColor.isAvailable()) miniApp.setBackgroundColor('#000000')
        if (themeParams.mount.isAvailable()) themeParams.mount()

        let tgUser: { id: number; firstName: string; lastName?: string; username?: string } | null = null

        try {
          initData.restore()
          const userData = initData.user()
          if (userData) {
            tgUser = {
              id: userData.id,
              firstName: userData.firstName,
              lastName: userData.lastName,
              username: userData.username,
            }
          }
        } catch {
          console.warn('[TelegramProvider] initData.restore() failed — falling back to initDataUnsafe')
        }

        // Fallback: SDK initData failed but raw WebApp API may still have the user
        if (!tgUser) {
          const raw = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
          if (raw?.id) {
            console.warn('[TelegramProvider] Using initDataUnsafe fallback')
            tgUser = {
              id: raw.id,
              firstName: raw.first_name ?? '',
              lastName: raw.last_name,
              username: raw.username,
            }
          }
        }

        if (tgUser) {
          setTelegramId(tgUser.id)
          await syncUserWithDatabase(tgUser)
        }

        if (miniApp.ready.isAvailable()) miniApp.ready()
        setIsReady(true)
      } catch (error) {
        console.error('[TelegramProvider] SDK init failed:', error)

        // Critical fallback: even if the entire SDK throws, try to get the
        // user from the raw window.Telegram.WebApp API so telegramId is set.
        const raw = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
        if (raw?.id) {
          console.warn('[TelegramProvider] SDK error fallback — using initDataUnsafe')
          const fallbackUser = {
            id: raw.id,
            firstName: raw.first_name ?? '',
            lastName: raw.last_name as string | undefined,
            username: raw.username as string | undefined,
          }
          setTelegramId(raw.id)
          try { await syncUserWithDatabase(fallbackUser) } catch {}
        }

        setIsReady(true)
      } finally {
        setIsLoading(false)
      }
    }

    const syncUserWithDatabase = async (tgUser: {
      id: number
      firstName: string
      lastName?: string
      username?: string
    }) => {
      const supabase = getSupabaseClient()

      // ── 1. Find or create the user record ────────────────────────────────────
      let dbUser: User | null = null

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', tgUser.id)
        .returns<User[]>()
        .maybeSingle()

      if (existingUser) {
        const needsUpdate =
          existingUser.first_name !== tgUser.firstName ||
          existingUser.last_name !== (tgUser.lastName ?? null) ||
          existingUser.username !== (tgUser.username ?? null)

        if (needsUpdate) {
          const { data: updated } = await supabase
            .from('users')
            .update({
              first_name: tgUser.firstName,
              last_name: tgUser.lastName ?? null,
              username: tgUser.username ?? null,
            })
            .eq('telegram_id', tgUser.id)
            .select()
            .returns<User[]>()
            .maybeSingle()
          dbUser = updated ?? existingUser
        } else {
          dbUser = existingUser
        }
      } else {
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            telegram_id: tgUser.id,
            first_name: tgUser.firstName,
            last_name: tgUser.lastName ?? null,
            username: tgUser.username ?? null,
          })
          .select()
          .returns<User[]>()
          .maybeSingle()
        dbUser = newUser
      }

      // ── 2. Ensure a Supabase session exists ───────────────────────────────────
      if (dbUser) {
        try {
          const { data: { session } } = await supabase.auth.getSession()

          if (!session) {
            const { data: anonData } = await supabase.auth.signInAnonymously()

            if (anonData?.user && !dbUser.supabase_user_id) {
              const { data: updated } = await supabase
                .from('users')
                .update({ supabase_user_id: anonData.user.id })
                .eq('id', dbUser.id)
                .select()
                .returns<User[]>()
                .maybeSingle()
              if (updated) dbUser = updated
            }
          } else if (!dbUser.supabase_user_id) {
            const { data: updated } = await supabase
              .from('users')
              .update({ supabase_user_id: session.user.id })
              .eq('id', dbUser.id)
              .select()
              .returns<User[]>()
              .maybeSingle()
            if (updated) dbUser = updated
          }
        } catch (err) {
          console.warn('Anonymous sign-in failed (enable it in Supabase Dashboard):', err)
        }

        setUser(dbUser)
      }
    }

    initTelegram()
  }, [])

  return (
    <TelegramContext.Provider value={{ isReady, isLoading, user, telegramId, refreshUser }}>
      {children}
    </TelegramContext.Provider>
  )
}
