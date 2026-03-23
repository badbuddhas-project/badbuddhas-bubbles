'use client'

import { useState } from 'react'

type Mode = 'register' | 'login' | 'forgot'

interface EmailGateProps {
  onComplete: (email: string) => void
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  background: 'rgba(10,10,10,0.6)',
  border: '1px solid rgba(255,255,255,0.15)',
  fontSize: 14,
  color: '#fff',
  outline: 'none',
}

export default function EmailGate({ onComplete }: EmailGateProps) {
  const [mode, setMode] = useState<Mode>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setSuccessMessage('')
  }

  const linkEmail = async (addr: string) => {
    try {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
      await fetch('/api/auth/link-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr, telegram_id: tgUser?.id || null }),
      })
    } catch { /* best-effort */ }
  }

  const handleSubmit = async () => {
    if (!email) { setError('Введите email'); return }
    if (mode !== 'forgot' && !password) { setError('Введите пароль'); return }

    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error === 'email_not_confirmed' ? 'Сначала подтвердите email' : 'Неверный email или пароль')
          setLoading(false)
          return
        }
        await linkEmail(email)
        onComplete(email)
      } else if (mode === 'register') {
        if (password.length < 6) { setError('Пароль минимум 6 символов'); setLoading(false); return }
        if (password !== confirmPassword) { setError('Пароли не совпадают'); setLoading(false); return }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Ошибка регистрации'); setLoading(false); return }

        await linkEmail(email)
        setSuccessMessage('Проверьте почту для подтверждения аккаунта')
        setLoading(false)
        return
      } else {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Что-то пошло не так')
          setLoading(false)
          return
        }
        setSuccessMessage('Ссылка для сброса отправлена на почту')
        setLoading(false)
        return
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'
  const isRegister = mode === 'register'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '44px 24px 36px',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>badbuddhas</span>
      </div>

      <p style={{ fontSize: 13, color: '#fff', opacity: 0.7, marginBottom: 32 }}>
        {isLogin ? 'Войдите в аккаунт' : isRegister ? 'Создайте аккаунт' : 'Сброс пароля'}
      </p>

      {successMessage ? (
        <div style={{ textAlign: 'center', maxWidth: 280 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%', background: '#0A0A0A',
              border: '2px solid #22c55e', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p style={{ fontSize: 14, color: '#CBCBCB', opacity: 0.6, marginBottom: 24 }}>{successMessage}</p>
          <span onClick={() => switchMode('login')} style={{ fontSize: 13, color: '#fff', cursor: 'pointer' }}>
            Войти
          </span>
        </div>
      ) : (
        <>
          <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={INPUT_STYLE}
            />
            {mode !== 'forgot' && (
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={INPUT_STYLE}
              />
            )}
            {isRegister && (
              <input
                type="password"
                placeholder="Подтвердите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={INPUT_STYLE}
              />
            )}

            {error && <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10,
                background: loading ? '#999' : '#fff', border: 'none',
                fontSize: 15, fontWeight: 700, color: '#000',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {isLogin
                ? (loading ? 'Входим...' : 'Войти')
                : isRegister
                  ? (loading ? 'Создаём...' : 'Создать аккаунт')
                  : (loading ? 'Отправляем...' : 'Отправить ссылку')}
            </button>

            {isLogin && (
              <div
                onClick={() => switchMode('forgot')}
                style={{ textAlign: 'center', fontSize: 12, color: '#CBCBCB', opacity: 0.4, cursor: 'pointer', marginTop: 4 }}
              >
                Забыли пароль?
              </div>
            )}
          </div>

          <div style={{ marginTop: 28, fontSize: 13, color: '#CBCBCB', opacity: 0.65 }}>
            {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <span
              onClick={() => switchMode(isLogin ? 'register' : 'login')}
              style={{ color: '#fff', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
            >
              {isLogin ? 'Создать' : 'Войти'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
