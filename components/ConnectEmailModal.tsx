'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useTranslation } from '@/lib/i18n'

type Step = 'email' | 'new' | 'merge' | 'success-new' | 'success-merge'

interface ConnectEmailModalProps {
  isOpen: boolean
  telegramId: number
  onClose: () => void
  onSuccess: (email: string) => void
}

export function ConnectEmailModal({
  isOpen,
  telegramId,
  onClose,
  onSuccess,
}: ConnectEmailModalProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  if (!isOpen) return null

  const reset = () => {
    setStep('email')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setResetSent(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // Step 1: check if email exists
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('connectEmailModal.failedCheckEmail'))
        return
      }
      setStep(data.exists ? 'merge' : 'new')
    } catch {
      setError(t('connectEmailModal.connectionFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2A: connect new email
  const handleConnectNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError(t('connectEmailModal.passwordMinChars'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('errors.passwordsDoNotMatch'))
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/connect-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('connectEmailModal.failedConnectEmail'))
        return
      }
      setStep('success-new')
    } catch {
      setError(t('connectEmailModal.connectionFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2B: merge accounts
  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError(t('connectEmailModal.enterPassword'))
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/merge-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          setError(t('connectEmailModal.wrongPassword'))
        } else {
          setError(data.error || t('connectEmailModal.failedLinkAccounts'))
        }
        return
      }
      setStep('success-merge')
    } catch {
      setError(t('connectEmailModal.connectionFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError(null)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        setError(error.message)
      } else {
        setResetSent(true)
      }
    } catch {
      setError(t('connectEmailModal.failedResetLink'))
    }
  }

  const handleDone = () => {
    if (step === 'success-merge') {
      onSuccess(email)
    }
    handleClose()
  }

  const inputClass = 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors'
  const btnClass = 'w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition-colors'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 bottom-0 z-50 pb-8">
        <div className="bg-zinc-900 rounded-3xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white">{t('connectEmailModal.title')}</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"
            >
              <XIcon className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Step 1: Enter email */}
          {step === 'email' && (
            <>
              <p className="text-zinc-500 text-sm mb-6">
                {t('connectEmailModal.step1Description')}
              </p>
              <form onSubmit={handleCheckEmail} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('connectEmailModal.emailPlaceholder')}
                  required
                  autoComplete="email"
                  className={inputClass}
                />
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <button type="submit" disabled={isLoading} className={btnClass}>
                  {isLoading ? t('connectEmailModal.checking') : t('connectEmailModal.continue')}
                </button>
              </form>
            </>
          )}

          {/* Step 2A: New email — create password */}
          {step === 'new' && (
            <>
              <p className="text-zinc-500 text-sm mb-6">
                {t('connectEmailModal.step2aDescription')}
              </p>
              <form onSubmit={handleConnectNew} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  disabled
                  className={inputClass + ' opacity-60'}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('connectEmailModal.passwordPlaceholder')}
                  required
                  autoComplete="new-password"
                  className={inputClass}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('connectEmailModal.confirmPasswordPlaceholder')}
                  required
                  autoComplete="new-password"
                  className={inputClass}
                />
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <button type="submit" disabled={isLoading} className={btnClass}>
                  {isLoading ? t('connectEmailModal.connecting') : t('connectEmailModal.connect')}
                </button>
              </form>
            </>
          )}

          {/* Step 2B: Existing email — enter password to merge */}
          {step === 'merge' && (
            <>
              <p className="text-zinc-500 text-sm mb-6">
                {t('connectEmailModal.step2bDescription')}
              </p>
              <form onSubmit={handleMerge} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  disabled
                  className={inputClass + ' opacity-60'}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password')}
                  required
                  autoComplete="current-password"
                  className={inputClass}
                />
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                {resetSent && <p className="text-emerald-400 text-sm text-center">{t('connectEmailModal.resetLinkSent')} {email}</p>}
                <button type="submit" disabled={isLoading} className={btnClass}>
                  {isLoading ? t('connectEmailModal.linking') : t('connectEmailModal.linkAccounts')}
                </button>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full text-center text-zinc-500 text-sm py-1"
                >
                  {t('connectEmailModal.forgotPassword')}
                </button>
              </form>
            </>
          )}

          {/* Step 3A: Success — new email connected */}
          {step === 'success-new' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-900/40 flex items-center justify-center mx-auto mb-3">
                <CheckIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-zinc-300 text-sm">
                {t('connectEmailModal.successNewTitle')} {t('connectEmailModal.successNewSentTo')} <span className="text-white font-medium">{email}</span>
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                {t('connectEmailModal.successNewDescription')}
              </p>
              <button onClick={handleDone} className="mt-5 w-full py-3 rounded-xl bg-zinc-800 text-white font-medium">
                {t('common.done')}
              </button>
            </div>
          )}

          {/* Step 3B: Success — accounts merged */}
          {step === 'success-merge' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-900/40 flex items-center justify-center mx-auto mb-3">
                <CheckIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-zinc-300 text-sm">
                {t('connectEmailModal.successMergeTitle')}
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                {t('connectEmailModal.successMergeDescription')}
              </p>
              <button onClick={handleDone} className="mt-5 w-full py-3 rounded-xl bg-zinc-800 text-white font-medium">
                {t('common.done')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
