'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { ymEvent, getPlatform } from '@/lib/analytics'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // If inside Telegram Mini App — skip login page
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.initData?.length > 0) {
      router.replace('/')
      return
    }
    setIsLoading(false)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'email_not_confirmed') {
          setError(t('auth.checkInboxConfirm'))
        } else {
          setError(t('auth.wrongEmailOrPassword'))
        }
        setIsSubmitting(false)
        return
      }

      ymEvent('user_logged_in', { method: 'email', platform: getPlatform() })
      router.push('/')
      router.refresh()
    } catch {
      setError(t('auth.networkError'))
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-white tracking-wider mb-8">BADBUDDHAS</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <input
          type="password"
          placeholder={t('auth.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center">
        <p className="text-zinc-500 text-sm">
          {t('auth.dontHaveAccount')}{' '}
          <Link href="/register" className="text-white underline">{t('auth.signUp')}</Link>
        </p>
        <p>
          <Link href="/forgot-password" className="text-zinc-500 text-sm underline">{t('auth.forgotPassword')}</Link>
        </p>
      </div>
    </div>
  )
}
