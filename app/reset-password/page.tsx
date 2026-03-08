'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { BrandMark } from '@/components/BrandMark'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
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
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
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
  }

  if (isLoading) {
    return (
      <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <BrandMark size={24} />
        <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>badbuddhas</span>
      </div>
      <div style={{ fontSize: 13, color: '#CBCBCB', opacity: 0.5, marginBottom: 32 }}>
        {success ? 'Пароль обновлён!' : 'Введите новый пароль'}
      </div>

      {!success ? (
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="Новый пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0A0A0A', border: '1px solid #1A1A1A', fontSize: 14, color: '#fff', outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Подтвердите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0A0A0A', border: '1px solid #1A1A1A', fontSize: 14, color: '#fff', outline: 'none' }}
          />
          <div style={{ minHeight: 20, fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
            {error || '\u00A0'}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ width: '100%', padding: '13px 0', borderRadius: 10, background: isSubmitting ? '#999' : '#fff', border: 'none', textAlign: 'center', cursor: isSubmitting ? 'default' : 'pointer', fontSize: 15, fontWeight: 600, color: '#000' }}
          >
            {isSubmitting ? 'Сохраняем...' : 'Сохранить пароль'}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0A0A0A', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontSize: 14, color: '#CBCBCB', opacity: 0.6, marginBottom: 24 }}>
            Теперь вы можете войти с новым паролем
          </div>
          <a
            href="/login"
            style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 28, background: '#fff', fontSize: 14, fontWeight: 600, color: '#000', textDecoration: 'none', cursor: 'pointer' }}
          >
            Войти
          </a>
        </div>
      )}
    </div>
  )
}
