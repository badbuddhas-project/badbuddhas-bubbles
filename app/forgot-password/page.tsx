'use client'

/**
 * Forgot-password page: submits the user's email to POST /api/auth/forgot-password
 * which sends a reset link (always returns 200 to prevent email enumeration).
 */

import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })

      if (res.ok) {
        setStatus('sent')
      } else {
        const data = await res.json()
        setErrorMsg(data.error || t('auth.somethingWentWrong'))
        setStatus('error')
      }
    } catch {
      setErrorMsg(t('auth.networkErrorRetry'))
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold text-white tracking-wider mb-2">BADBUDDHAS</h1>
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">{t('auth.checkYourEmail')}</h2>
          <p className="text-gray-400 mb-6">
            {t('auth.resetEmailSent')} <span className="text-white">{email}</span>
          </p>
          <Link href="/login" className="text-green-500 hover:underline">
            {t('auth.backToSignIn')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-white tracking-wider mb-2">BADBUDDHAS</h1>
      <p className="text-gray-400 mb-8">{t('auth.resetYourPassword')}</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <p className="text-gray-400 text-sm text-center">
          {t('auth.enterEmailResetLink')}
        </p>
        <input
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-green-500 outline-none"
          required
        />

        {status === 'error' && (
          <p className="text-red-500 text-center text-sm">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full p-4 rounded-lg bg-green-500 text-black font-semibold hover:bg-green-400 disabled:opacity-50"
        >
          {status === 'loading' ? t('auth.sending') : t('auth.sendResetLink')}
        </button>
      </form>

      <p className="mt-6 text-gray-400">
        {t('auth.rememberPassword')}{' '}
        <Link href="/login" className="text-green-500 hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </div>
  )
}
