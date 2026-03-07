'use client'

/**
 * Email-confirmed success page shown after the user clicks the Supabase confirmation link.
 */

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n'

const TELEGRAM_URL = 'https://t.me/badbuddhas_practice_bot/BadBuddhas'

function useTelegramAvailable() {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    setAvailable(!!(window as any).Telegram?.WebApp)
  }, [])
  return available
}

function ConfirmContent() {
  const params = useSearchParams()
  const error  = params?.get('error')
  const email  = params?.get('email')
  const isTelegram = useTelegramAvailable()
  const { t } = useTranslation()

  const buttonLabel = isTelegram ? t('authConfirm.backToTelegram') : t('authConfirm.continueBtn')
  const buttonHref  = isTelegram ? TELEGRAM_URL : '/'

  if (error) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">{t('authConfirm.linkExpired')}</h2>
        <p className="text-zinc-400 text-sm mb-6">
          {t('authConfirm.linkExpiredMessage')}<br />
          {t('authConfirm.requestNewLink')}
        </p>
        <a
          href={buttonHref}
          className="inline-block px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold"
        >
          {buttonLabel}
        </a>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{t('authConfirm.emailConfirmed')}</h2>
      <p className="text-zinc-400 mb-8">
        {email
          ? <>{t('authConfirm.signedInAs')} <span className="text-white font-medium">{email}</span></>
          : t('authConfirm.emailLinked')}
      </p>
      <a
        href={buttonHref}
        className="inline-block w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-center transition-colors mb-3"
      >
        {buttonLabel}
      </a>
      {isTelegram && (
        <a
          href="/"
          className="inline-block text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          {t('authConfirm.continueInBrowser')}
        </a>
      )}
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center mx-auto mb-2">
          <span className="text-white font-bold text-xl">B</span>
        </div>
        <p className="text-center text-white font-bold tracking-widest text-sm">BADBUDDHAS</p>
      </div>
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin mx-auto" />}>
          <ConfirmContent />
        </Suspense>
      </div>
    </main>
  )
}
