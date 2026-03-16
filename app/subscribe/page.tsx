'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const WHITE = '#FFFFFF'
const PINK = '#C034A5'
const GREEN = '#54C68C'
const DARK_CARD = '#0A0A0A'
const CARD_BORDER = '#1A1A1A'

const FEATURES = [
  { emoji: '🎧', title: 'Все практики', desc: 'доступ к расширенной библиотеке' },
  { emoji: '📖', title: 'Теория дыхания', desc: 'статьи и материалы от инструкторов' },
  { emoji: '📅', title: 'Расписание', desc: 'живые сессии 2 раза в неделю' },
  { emoji: '💬', title: 'Сообщество', desc: 'закрытая группа в Telegram' },
] as const

export default function SubscribePage() {
  const router = useRouter()
  const [showWidget, setShowWidget] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)

  const handleSubscribe = () => {
    setShowWidget(true)
    setTimeout(() => {
      widgetRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleBack = () => {
    setShowWidget(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 pb-12">
      {/* Back button */}
      <div className="pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          ← назад
        </button>
      </div>

      {/* Hero */}
      <div className="text-center pt-8 pb-10">
        <h1 className="text-3xl font-bold mb-3" style={{ color: WHITE }}>
          [ чёрный баблс ]
        </h1>
        <p className="text-lg" style={{ color: GREEN }}>
          раскрой дыхание полностью
        </p>
      </div>

      {/* Features */}
      <div className="space-y-3 max-w-md mx-auto mb-10">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl p-4 flex items-start gap-4"
            style={{
              backgroundColor: DARK_CARD,
              border: `1px solid ${CARD_BORDER}`,
            }}
          >
            <span className="text-2xl mt-0.5">{f.emoji}</span>
            <div>
              <p className="font-semibold text-white">{f.title}</p>
              <p className="text-sm text-white/60">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {!showWidget && (
        <div className="max-w-md mx-auto text-center">
          <button
            onClick={handleSubscribe}
            className="w-full py-4 rounded-2xl font-semibold text-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: PINK }}
          >
            Оформить подписку
          </button>
          <p className="text-xs text-white/40 mt-4">
            оплата через GetCourse · отмена в любой момент
          </p>
        </div>
      )}

      {/* GetCourse Widget */}
      {showWidget && (
        <div className="max-w-md mx-auto" ref={widgetRef}>
          <button
            onClick={handleBack}
            className="text-white/60 hover:text-white transition-colors text-sm mb-4 flex items-center gap-1"
          >
            ← Назад к описанию
          </button>

          <iframe
            src="/gc-widget.html"
            className="w-full rounded-2xl"
            style={{
              minHeight: 600,
              background: DARK_CARD,
              border: 'none',
              borderRadius: 16,
            }}
            title="Оплата подписки"
          />

          <p className="text-xs text-white/40 mt-4 text-center">
            оплата через GetCourse · отмена в любой момент
          </p>
        </div>
      )}
    </div>
  )
}
