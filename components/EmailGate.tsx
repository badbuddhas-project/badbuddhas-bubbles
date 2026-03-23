'use client'

import { useState } from 'react'

interface EmailGateProps {
  onComplete: (email: string) => void
  onSkip: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailGate({ onComplete, onSkip }: EmailGateProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setError('Введите корректный email')
      return
    }
    setLoading(true)
    setError('')

    try {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
      const res = await fetch('/api/auth/link-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, telegram_id: tgUser?.id || null }),
      })
      const data = await res.json()

      if (data.success) {
        onComplete(trimmed)
      } else {
        setError(data.error || 'Не удалось сохранить email')
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
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
          badbuddhas
        </span>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Ваш email</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>для доступа к материалам</p>

      <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 12,
            background: '#0A0A0A',
            border: '1px solid #1A1A1A',
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
            borderRadius: 12,
            background: loading ? '#8a2278' : '#C034A5',
            border: 'none',
            fontSize: 15,
            fontWeight: 600,
            color: '#fff',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Сохраняем...' : 'Продолжить'}
        </button>

        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 12,
            color: '#6b7280',
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          Пропустить
        </button>
      </div>
    </div>
  )
}
