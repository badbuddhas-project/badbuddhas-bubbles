'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { BrandMark } from '@/components/BrandMark'
import { ymEvent, getPlatform } from '@/lib/analytics'

type Mode = 'login' | 'register' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.initData?.length > 0) {
      router.replace('/')
      return
    }
    setIsLoading(false)
  }, [router])

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setError('')
    setSuccessMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error === 'email_not_confirmed'
            ? 'Please confirm your email first'
            : 'Wrong email or password')
          setIsSubmitting(false)
          return
        }
        ymEvent('user_logged_in', { method: 'email', platform: getPlatform() })
        router.push('/')
        router.refresh()
      } else if (mode === 'register') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setIsSubmitting(false)
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setIsSubmitting(false)
          return
        }
        const supabase = getSupabaseClient()
        const { error: authError } = await supabase.auth.signUp({ email, password })
        if (authError) {
          setError(authError.message)
          setIsSubmitting(false)
          return
        }
        ymEvent('user_registered', { method: 'email', platform: getPlatform() })
        setSuccessMessage('Check your email to confirm your account')
        setIsSubmitting(false)
        return
      } else {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Something went wrong')
          setIsSubmitting(false)
          return
        }
        setSuccessMessage('Reset link sent! Check your email')
        setIsSubmitting(false)
        return
      }
    } catch {
      setError('Network error. Please try again')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (successMessage) {
    return (
      <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 24px 36px' }}>
        <div style={{ marginBottom: 8 }}>
          <BrandMark size={28} />
        </div>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0A0A0A', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '32px 0 20px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <div style={{ fontSize: 14, color: '#CBCBCB', opacity: 0.6, textAlign: 'center', maxWidth: 260, marginBottom: 24 }}>{successMessage}</div>
        <span
          onClick={() => switchMode('login')}
          style={{ fontSize: 13, color: '#fff', cursor: 'pointer' }}
        >
          Back to Sign in
        </span>
      </div>
    )
  }

  const isLogin = mode === 'login'
  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'

  return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 24px 36px' }}>
      <div style={{ marginBottom: 8 }}>
        <BrandMark size={28} />
      </div>
      <div style={{ fontSize: 13, color: '#CBCBCB', opacity: 0.5, marginBottom: 32 }}>
        {isLogin ? 'Sign in to continue' : isRegister ? 'Create your account' : 'Reset your password'}
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0A0A0A', border: '1px solid #1A1A1A', fontSize: 14, color: '#fff', outline: 'none' }}
        />
        {!isForgot && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0A0A0A', border: '1px solid #1A1A1A', fontSize: 14, color: '#fff', outline: 'none' }}
          />
        )}
        {isRegister && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0A0A0A', border: '1px solid #1A1A1A', fontSize: 14, color: '#fff', outline: 'none' }}
          />
        )}

        <div style={{ minHeight: 20, fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
          {error || '\u00A0'}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ width: '100%', padding: '13px 0', borderRadius: 10, background: isSubmitting ? '#999' : '#fff', border: 'none', textAlign: 'center', cursor: isSubmitting ? 'default' : 'pointer', fontSize: 15, fontWeight: 600, color: '#000' }}
        >
          {isLogin
            ? (isSubmitting ? 'Signing in...' : 'Sign in')
            : isRegister
              ? (isSubmitting ? 'Creating account...' : 'Sign up')
              : (isSubmitting ? 'Sending...' : 'Send reset link')}
        </button>

        {isLogin && (
          <div
            onClick={() => switchMode('forgot')}
            style={{ textAlign: 'center', fontSize: 12, color: '#CBCBCB', opacity: 0.4, cursor: 'pointer', marginTop: 4 }}
          >
            Forgot password?
          </div>
        )}
      </form>

      <div style={{ marginTop: 28, fontSize: 13, color: '#CBCBCB', opacity: 0.5 }}>
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <span
          onClick={() => switchMode(isLogin ? 'register' : 'login')}
          style={{ color: '#fff', opacity: 1, cursor: 'pointer' }}
        >
          {isLogin ? 'Sign up' : 'Sign in'}
        </span>
      </div>
    </div>
  )
}
