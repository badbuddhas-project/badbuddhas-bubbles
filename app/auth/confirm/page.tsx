'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

const TELEGRAM_URL = 'https://t.me/BadBuddhas_bubbles_bot/breathe'

function useTelegramAvailable() {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    setAvailable(!!(window as any).Telegram?.WebApp)
  }, [])
  return available
}

function ConfirmContent() {
  const params = useSearchParams()
  const error = params?.get('error')
  const isTelegram = useTelegramAvailable()

  const buttonHref = isTelegram ? TELEGRAM_URL : '/'

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#0A0A0A', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
          Ссылка недействительна
        </div>
        <div style={{ fontSize: 14, color: '#CBCBCB', opacity: 0.6, textAlign: 'center', lineHeight: 1.5, marginBottom: 32, maxWidth: 260 }}>
          Ссылка для подтверждения устарела или уже была использована. Попробуйте отправить новую
        </div>
        <a
          href="/login"
          style={{ padding: '14px 40px', borderRadius: 28, background: '#fff', fontSize: 15, fontWeight: 600, color: '#000', textDecoration: 'none', cursor: 'pointer' }}
        >
          На страницу входа
        </a>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#0A0A0A', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
        Email подтверждён!
      </div>
      <div style={{ fontSize: 14, color: '#CBCBCB', opacity: 0.6, textAlign: 'center', lineHeight: 1.5, marginBottom: 32, maxWidth: 260 }}>
        Теперь вы можете входить в приложение через браузер, используя email и пароль
      </div>
      <a
        href={buttonHref}
        style={{ padding: '14px 40px', borderRadius: 28, background: '#fff', fontSize: 15, fontWeight: 600, color: '#000', textDecoration: 'none', cursor: 'pointer' }}
      >
        Перейти в приложение
      </a>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <main style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 24px' }}>
      <Suspense fallback={<div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />}>
        <ConfirmContent />
      </Suspense>
    </main>
  )
}
