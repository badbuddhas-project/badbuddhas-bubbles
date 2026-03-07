'use client'

/**
 * Set new password page — user arrives here after clicking the Supabase recovery link.
 * The auth/callback route has already exchanged the code and set a Supabase session.
 * We use supabase.auth.updateUser({ password }) to set the new password.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import { useTranslation } from '@/lib/i18n'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'))
      return
    }

    setIsSubmitting(true)

    const supabase = getSupabaseClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setIsSubmitting(false)
      return
    }

    setSuccess(true)
    setIsSubmitting(false)
    setTimeout(() => router.push('/login'), 2000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold text-white tracking-wider mb-4">BADBUDDHAS</h1>
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white text-center mb-2">{t('auth.passwordUpdated')}</p>
        <p className="text-zinc-400 text-sm text-center">{t('auth.redirecting')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-white tracking-wider mb-2">BADBUDDHAS</h1>
      <p className="text-zinc-400 mb-8">{t('auth.setNewPassword')}</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="password"
          placeholder={t('auth.newPassword')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <input
          type="password"
          placeholder={t('auth.confirmPassword')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
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
          {isSubmitting ? t('auth.updating') : t('auth.updatePassword')}
        </button>
      </form>

      <p className="mt-6 text-zinc-500 text-sm">
        <Link href="/login" className="text-white underline">{t('auth.backToSignIn')}</Link>
      </p>
    </div>
  )
}
