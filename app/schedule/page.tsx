'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useTranslation } from '@/lib/i18n'
import { BrandMark } from '@/components/BrandMark'
import { TabBar } from '@/components/TabBar'

const C = {
  bg: '#000',
  card: '#0A0A0A',
  border: '#1A1A1A',
  white: '#fff',
  text: '#CBCBCB',
  sub: 'rgba(203,203,203,0.45)',
  green: '#54C68C',
}

interface ScheduleEvent {
  id?: string
  title: string
  datetime_start: string
  datetime_end?: string
  description?: string
  location?: string
  link_short?: string
  timezone?: string
}

export default function SchedulePage() {
  const router = useRouter()
  const { user } = useUser()
  const { language } = useTranslation()
  const isPremium = user?.is_premium ?? false

  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/schedule')
      .then(r => r.json())
      .then(data => { setEvents(data.events || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDay = (iso: string) => {
    const d = new Date(iso)
    return String(d.getDate())
  }

  const formatMonth = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')
  }

  return (
    <main style={{ minHeight: '100vh', background: C.bg, overflowY: 'auto', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '44px 16px 12px' }}>
        <BrandMark size={18} />
        <button
          onClick={() => router.push('/profile')}
          style={{ width: 36, height: 36, borderRadius: '50%', background: C.card, border: `1.5px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 14, color: C.sub }}>
              {language === 'ru' ? 'Нет запланированных сессий' : 'No scheduled sessions'}
            </div>
          </div>
        ) : (
          events.map((ev, i) => (
            <div
              key={ev.id || i}
              style={{
                background: C.card,
                borderRadius: 16,
                padding: '16px',
                marginBottom: 12,
                border: `1px solid ${C.border}`,
                display: 'flex',
                gap: 14,
                alignItems: 'center',
              }}
            >
              {/* Date badge */}
              <div style={{
                textAlign: 'center',
                background: 'rgba(84,198,140,0.1)',
                borderRadius: 12,
                padding: '8px 12px',
                flexShrink: 0,
                minWidth: 46,
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{formatDay(ev.datetime_start)}</div>
                <div style={{ fontSize: 10, color: C.green, textTransform: 'uppercase' }}>{formatMonth(ev.datetime_start)}</div>
              </div>

              {/* Details */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
                  {ev.title}
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>
                  {formatTime(ev.datetime_start)} · {formatDate(ev.datetime_start)}
                </div>
                {ev.location && (
                  <a
                    href={ev.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 11, color: C.green, textDecoration: 'none' }}
                  >
                    {language === 'ru' ? 'Подробнее →' : 'Details →'}
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <TabBar isPremium={isPremium} />
    </main>
  )
}
