'use client'

import { useState } from 'react'

interface EmailGateProps {
  onComplete: (email: string) => void
}

export default function EmailGate({ onComplete }: EmailGateProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Заполните все поля')
      return
    }
    setLoading(true)
    setError('')

    try {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
      const res = await fetch('/api/auth/link-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          telegram_id: tgUser?.id || null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        onComplete(email)
      } else {
        setError(data.error || 'Ошибка при сохранении email')
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

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
        <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
          badbuddhas
        </span>
      </div>

      <p style={{ fontSize: 13, color: '#fff', opacity: 0.7, marginBottom: 32 }}>Создайте аккаунт</p>

      <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(10,10,10,0.6)',
            border: '1px solid rgba(255,255,255,0.15)',
            fontSize: 14,
            color: '#fff',
            outline: 'none',
          }}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(10,10,10,0.6)',
            border: '1px solid rgba(255,255,255,0.15)',
            fontSize: 14,
            color: '#fff',
            outline: 'none',
          }}
        />

        {error && <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '13px 0',
            borderRadius: 10,
            background: '#fff',
            border: 'none',
            fontSize: 15,
            fontWeight: 700,
            color: '#000',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Сохраняем...' : 'Продолжить'}
        </button>
      </div>
    </div>
  )
}
