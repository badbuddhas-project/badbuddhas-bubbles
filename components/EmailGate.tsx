'use client'

import { useState } from 'react'
import { BreathingLogo } from './BreathingLogo'

interface EmailGateProps {
  onComplete: (email: string) => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailGate({ onComplete }: EmailGateProps) {
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
        // Reload to pick up is_premium if a pending subscription was activated
        setTimeout(() => window.location.reload(), 300)
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
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        minHeight: '100vh',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Decorative glows */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '140%',
          height: '60%',
          background: 'radial-gradient(ellipse at center, rgba(123,31,162,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '140%',
          height: '60%',
          background: 'radial-gradient(ellipse at center, rgba(192,52,165,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <BreathingLogo size={80} />

        <span style={{ fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '0.04em', marginTop: 16 }}>
          badbuddhas
        </span>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 24, marginBottom: 0 }}>
          Ваш email
        </h2>

        <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
          для доступа к материалам
        </p>

        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{
            width: '100%',
            maxWidth: 340,
            padding: '14px 16px',
            borderRadius: 16,
            background: '#0A0A0A',
            border: '1px solid #1A1A1A',
            fontSize: 16,
            color: '#fff',
            outline: 'none',
            marginTop: 32,
            boxSizing: 'border-box',
          }}
        />

        {error && <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 8 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            maxWidth: 340,
            padding: '14px 0',
            borderRadius: 16,
            background: loading ? '#8a2278' : 'linear-gradient(135deg, #C034A5, #7b1fa2)',
            border: 'none',
            fontSize: 15,
            fontWeight: 600,
            color: '#fff',
            cursor: loading ? 'wait' : 'pointer',
            marginTop: 16,
          }}
        >
          {loading ? 'Сохраняем...' : 'Продолжить'}
        </button>

        <p
          style={{
            maxWidth: 340,
            textAlign: 'center',
            fontSize: 11,
            color: '#9ca3af',
            lineHeight: 1.5,
            marginTop: 24,
          }}
        >
          Продолжая, вы соглашаетесь на обработку персональных данных в соответствии с{' '}
          <a href="https://badbuddhas.world/policy" target="_blank" rel="noopener noreferrer" style={{ color: '#9ca3af', textDecoration: 'underline' }}>
            Политикой конфиденциальности
          </a>{' '}
          и с условиями{' '}
          <a href="https://badbuddhas.world/ofertabubbles" target="_blank" rel="noopener noreferrer" style={{ color: '#9ca3af', textDecoration: 'underline' }}>
            Оферты
          </a>
        </p>
      </div>
    </div>
  )
}
