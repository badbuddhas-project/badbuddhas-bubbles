'use client'

/**
 * Profile page: shows user stats (streak, total minutes), account settings,
 * and the ConnectEmailModal for linking an email to a Telegram account.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { useUser } from '@/hooks/useUser'
import { useUserStats } from '@/hooks/useUserStats'
import { BottomSheet, BottomSheetOption } from '@/components/BottomSheet'
import { ConnectEmailModal } from '@/components/ConnectEmailModal'
import { useTranslation } from '@/lib/i18n'
import { ymEvent, getPlatform } from '@/lib/analytics'

const APP_VERSION = '1.0.0'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading: isUserLoading, isTelegram, signOut, refreshUser } = useUser()
  const { stats, isLoading: isStatsLoading } = useUserStats()
  const { t, language, setLanguage } = useTranslation()

  const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState(false)
  const [isConnectEmailOpen, setIsConnectEmailOpen] = useState(false)

  // Analytics: profile viewed
  useEffect(() => {
    ymEvent('profile_viewed', { platform: getPlatform() })
  }, [])

  const isPremium = user?.is_premium ?? false
  const [resendState,    setResendState]    = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const languageOptions = [
    { value: 'ru', label: 'Русский' },
    { value: 'en', label: 'English' },
  ]

  const handleDisconnectEmail = async () => {
    if (!user?.telegram_id) return
    const ok = window.confirm(t('profile.disconnectConfirm'))
    if (!ok) return
    setIsDisconnecting(true)
    try {
      const res = await fetch('/api/auth/disconnect-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.telegram_id }),
      })
      if (res.ok) {
        void refreshUser()
      }
    } catch { /* ignore */ }
    setIsDisconnecting(false)
  }

  const handleResendEmail = async () => {
    if (!user?.email) return
    setResendState('loading')
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { error } = await supabase.auth.resend({
        type:    'signup',
        email:   user.email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      setResendState(error ? 'error' : 'sent')
      if (!error) setTimeout(() => setResendState('idle'), 5000)
    } catch {
      setResendState('error')
    }
  }

  // Poll email confirmation status while in Telegram and email is unconfirmed.
  // Runs every 5 s; stops as soon as email_confirmed_at is set.
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const shouldPoll = isTelegram && !!user?.email && !user?.email_confirmed_at && !!user?.telegram_id

    if (!shouldPoll) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      return
    }

    const check = async () => {
      try {
        const res = await fetch(`/api/auth/email-status?telegram_id=${user.telegram_id}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.confirmed) {
          void refreshUser()
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      } catch { /* ignore */ }
    }

    pollingRef.current = setInterval(check, 5000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [isTelegram, user?.email, user?.email_confirmed_at, user?.telegram_id, refreshUser])

  const formatLastPracticeDate = () => {
    if (!stats?.last_practice_date) return t('profile.never')
    const date = new Date(stats.last_practice_date)
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleBack = () => {
    router.back()
  }

  const handleLogout = async () => {
    await signOut()
  }

  if (isUserLoading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500">{t('common.loading')}</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black pb-8">
      {/* Header */}
      <header className="flex items-center gap-4 p-4">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center"
        >
          <ArrowLeftIcon className="w-5 h-5 text-white" />
        </button>
      </header>

      {/* Profile Avatar & Status */}
      <section className="flex flex-col items-center px-4 mb-6">
        <div className="w-20 h-20 rounded-full bg-violet-600 flex items-center justify-center mb-3">
          {user?.first_name ? (
            <span className="text-3xl font-bold text-white">
              {user.first_name.charAt(0).toUpperCase()}
            </span>
          ) : user?.email ? (
            <span className="text-3xl font-bold text-white">
              {user.email.charAt(0).toUpperCase()}
            </span>
          ) : (
            <UserIcon className="w-10 h-10 text-white" />
          )}
        </div>
        {user?.email && (
          <p className="text-zinc-400 text-sm mb-2">{user.email}</p>
        )}
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isPremium
              ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {isPremium ? t('profile.premiumAccount') : t('profile.freeAccount')}
        </div>
      </section>

      {/* Stats Card */}
      <section className="px-4 mb-6">
        <div className="bg-zinc-900 rounded-2xl p-5">
          <h2 className="text-lg font-bold text-white text-center mb-4">
            {t('profile.youAreFantastic')}
          </h2>

          {/* Stats Grid */}
          <div className="flex justify-around mb-4">
            <StatItem
              value={isStatsLoading ? '-' : String(stats?.current_streak ?? 0)}
              label={t('profile.streak')}
              testId="stat-streak"
            />
            <div className="w-px bg-zinc-700" />
            <StatItem
              value={isStatsLoading ? '-' : String(stats?.total_practices ?? 0)}
              label={t('profile.practices')}
              testId="stat-practices"
            />
            <div className="w-px bg-zinc-700" />
            <StatItem
              value={isStatsLoading ? '-' : String(stats?.total_minutes ?? 0)}
              label={t('profile.minutes')}
              testId="stat-minutes"
            />
          </div>

          {/* Last Practice */}
          <p className="text-sm text-zinc-500 text-center mb-4">
            {t('profile.lastPractice')} {formatLastPracticeDate()}
          </p>

        </div>
      </section>

      {/* Menu */}
      <section className="px-4 mb-6">
        <div className="bg-zinc-900 rounded-2xl overflow-hidden">
          <MenuItem
            icon={<SettingsIcon className="w-5 h-5" />}
            label={t('profile.settings')}
            onClick={() => router.push('/profile/settings')}
          />
          <MenuItem
            icon={<GlobeIcon className="w-5 h-5" />}
            label={t('profile.language')}
            value={language === 'ru' ? 'Русский' : 'English'}
            onClick={() => setIsLanguageSheetOpen(true)}
          />
          <MenuItem
            icon={<QuestionIcon className="w-5 h-5" />}
            label={t('profile.faq')}
            onClick={() => router.push('/profile/faq')}
          />
          <MenuItem
            icon={<TelegramIcon className="w-5 h-5" />}
            label={t('profile.communityChat')}
            onClick={() => window.open('https://t.me/badbuddhas', '_blank')}
            external
          />
          <MenuItem
            icon={<MailIcon className="w-5 h-5" />}
            label={t('profile.contactUs')}
            onClick={() => window.open('mailto:contact@badbuddhas.com', '_blank')}
            external
          />
        </div>
      </section>

      {/* Telegram: Connect Email or show connected email */}
      {isTelegram && (
        <section className="px-4 mb-4">
          {user?.email ? (
            <div className="bg-zinc-900 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-3">
                <EmailIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 mb-0.5">
                    {user.email_confirmed_at ? t('profile.connectedEmail') : t('profile.emailNotVerified')}
                  </p>
                  <p className="text-white text-sm truncate">{user.email}</p>
                </div>
                {user.email_confirmed_at ? (
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="text-xs text-amber-400 shrink-0">{t('profile.pending')}</span>
                )}
              </div>
              {!user.email_confirmed_at && (
                <button
                  onClick={handleResendEmail}
                  disabled={resendState === 'loading' || resendState === 'sent'}
                  className="mt-3 w-full py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {resendState === 'loading' ? t('profile.sendingEmail')    :
                   resendState === 'sent'    ? t('profile.emailSent') :
                   resendState === 'error'   ? t('profile.errorTryAgain') :
                   t('profile.resendConfirmation')}
                </button>
              )}
              <button
                onClick={handleDisconnectEmail}
                disabled={isDisconnecting}
                className="mt-2 w-full py-2 text-zinc-500 text-xs font-medium disabled:opacity-50 transition-colors"
              >
                {isDisconnecting ? t('profile.disconnecting') : t('profile.disconnectEmail')}
              </button>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <EmailIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="font-semibold text-white">{t('profile.syncProgress')}</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                {t('profile.syncDescription')}
              </p>
              <button
                onClick={() => setIsConnectEmailOpen(true)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
              >
                {t('profile.connectEmail')}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Logout / Close */}
      <section className="px-4 mb-8">
        {isTelegram ? (
          <button
            onClick={handleLogout}
            className="w-full py-4 bg-zinc-900 rounded-2xl text-zinc-400 font-medium"
          >
            {t('profile.closeApp')}
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full py-4 bg-zinc-900 rounded-2xl text-zinc-400 font-medium"
          >
            {t('profile.logout')}
          </button>
        )}
      </section>

      {/* ConnectEmailModal */}
      {isTelegram && user?.telegram_id && (
        <ConnectEmailModal
          isOpen={isConnectEmailOpen}
          telegramId={user.telegram_id}
          onClose={() => setIsConnectEmailOpen(false)}
          onSuccess={() => {
            // Only refresh — modal closes via onClose (Done button)
            void refreshUser()
          }}
        />
      )}

      {/* Version */}
      <div className="text-center text-zinc-600 text-sm">
        v{APP_VERSION}
      </div>

      {/* Language Bottom Sheet */}
      <BottomSheet
        isOpen={isLanguageSheetOpen}
        onClose={() => setIsLanguageSheetOpen(false)}
        title={t('profile.language')}
      >
        <div className="py-2">
          {languageOptions.map((option) => (
            <BottomSheetOption
              key={option.value}
              label={option.label}
              isSelected={option.value === language}
              onClick={() => {
                setLanguage(option.value as 'ru' | 'en')
                setIsLanguageSheetOpen(false)
              }}
            />
          ))}
        </div>
      </BottomSheet>
    </main>
  )
}

function StatItem({ value, label, testId }: { value: string; label: string; testId?: string }) {
  return (
    <div className="flex flex-col items-center" data-testid={testId}>
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  )
}

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  value?: string
  onClick: () => void
  external?: boolean
}

function MenuItem({ icon, label, value, onClick, external }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 border-b border-zinc-800 last:border-b-0 active:bg-zinc-800/50 text-white"
    >
      <span className="text-zinc-400">{icon}</span>
      <span className="flex-1 text-left text-white">{label}</span>
      {value && <span className="text-zinc-500">{value}</span>}
      {external ? (
        <ExternalLinkIcon className="w-4 h-4 text-zinc-600" />
      ) : (
        <ChevronRightIcon className="w-5 h-5 text-zinc-600" />
      )}
    </button>
  )
}

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  )
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
