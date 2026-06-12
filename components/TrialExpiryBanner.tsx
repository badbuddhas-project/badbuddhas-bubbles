'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'

export function TrialExpiryBanner() {
  const { user, trialDaysLeft } = useUser()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || user?.is_premium || trialDaysLeft <= 0 || trialDaysLeft > 3) return null

  const text = trialDaysLeft === 1
    ? 'Пробный период заканчивается завтра'
    : `Пробный период заканчивается через ${trialDaysLeft} дня`

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'linear-gradient(135deg, #C034A5, #7b1fa2)',
      padding: '10px 16px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 8,
    }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{text}</span>
        <button
          onClick={() => router.push('/subscribe')}
          style={{
            marginLeft: 12, fontSize: 12, fontWeight: 700, color: '#fff',
            textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          Подписаться за 500 ₽
        </button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1 }}
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
  )
}
