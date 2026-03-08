'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { useUserStats } from '@/hooks/useUserStats'
import { ConnectEmailModal } from '@/components/ConnectEmailModal'
import { useTranslation } from '@/lib/i18n'
import { ymEvent, getPlatform } from '@/lib/analytics'
import { closeTelegramApp } from '@/lib/telegram'

const QUOTES = [
  { text: 'Мы не можем дышать ни в прошлом, ни в будущем. Мы делаем вдох и выдох всегда в настоящем.', author: 'Даша Чен' },
  { text: 'У ума есть одно забавное свойство: если вы задаёте вопрос, а потом молча слушаете, то обычно появляется ответ.', author: 'Йонге Мингьюр Ринпоче' },
  { text: 'Сначала вы влюбляетесь в идею, в самый маленький кусочек. И как только вы начинаете его понимать, все остальное приходит само.', author: 'Дэвид Линч' },
  { text: 'Выход всегда находится внутри.', author: 'Тит Нан Хан' },
  { text: 'Люди обычно считают чудом хождение по воде или по воздуху. Но я думаю, что реальное чудо — это идти внимательно по земле.', author: 'Тит Нат Хан' },
]

const BLACK = '#000000'
const DARK_CARD = '#0A0A0A'
const CARD_BORDER = '#1A1A1A'
const GREY = '#CBCBCB'
const WHITE = '#FFFFFF'
const TURF = '#313333'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading: isUserLoading, isTelegram, signOut, refreshUser } = useUser()
  const { stats, isLoading: isStatsLoading } = useUserStats()
  const { t, language } = useTranslation()

  const [isConnectEmailOpen, setIsConnectEmailOpen] = useState(false)
  const [lastPractice, setLastPractice] = useState<{ name: string; date: string } | null>(null)

  // Random quote, stable per mount
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  // Analytics: profile viewed
  useEffect(() => {
    ymEvent('profile_viewed', { platform: getPlatform() })
  }, [])

  // Fetch last practice
  useEffect(() => {
    if (!user) return
    const fetchLastPractice = async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('user_practices')
        .select('practice_id, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()
      if (!data) return
      const { data: practice } = await supabase
        .from('practices')
        .select('title_ru, title')
        .eq('id', data.practice_id)
        .single()
      if (practice) {
        setLastPractice({
          name: practice.title_ru || practice.title,
          date: data.completed_at,
        })
      }
    }
    fetchLastPractice()
  }, [user])

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'сегодня'
    if (diffDays === 1) return 'вчера'
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' })
  }

  const handleLogout = async () => {
    await signOut()
  }

  const handleClose = () => {
    if (isTelegram) {
      closeTelegramApp()
    } else {
      handleLogout()
    }
  }

  const displayName = user?.first_name || user?.username || user?.email?.split('@')[0] || 'User'

  const menuItems = [
    { label: 'Настройки', sub: 'аккаунт', onClick: () => router.push('/profile/settings') },
    { label: 'Язык', sub: language === 'ru' ? 'русский' : 'english', onClick: () => router.push('/profile/settings') },
    { label: 'Частые вопросы', sub: '', onClick: () => router.push('/profile/faq') },
    { label: 'Чат сообщества', sub: '', onClick: () => window.open('https://t.me/badbuddhas', '_blank') },
    { label: 'Связаться с нами', sub: '', onClick: () => window.open('mailto:contact@badbuddhas.com', '_blank') },
  ]

  if (isUserLoading) {
    return (
      <main style={{ minHeight: '100vh', background: BLACK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#71717a' }}>{t('common.loading')}</div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: BLACK, padding: '44px 16px 80px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: WHITE }}>Профиль</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.svg" alt="badbuddhas" width={16} style={{ display: 'block' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: WHITE }}>badbuddhas</span>
        </div>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 6 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', marginBottom: 10,
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${CARD_BORDER}`,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.svg" alt="" width={28} style={{ display: 'block', opacity: 0.9 }} />
        </div>
      </div>

      {/* Name */}
      <div style={{ textAlign: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 18, fontWeight: 500, color: WHITE }}>{displayName}</span>
      </div>

      {/* Account type */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: GREY }}>бесплатный аккаунт</span>
      </div>

      {/* Motivational quote */}
      <div style={{ textAlign: 'center', marginBottom: 18, padding: '0 12px' }}>
        <span style={{ fontSize: 12, color: GREY }}>
          <span style={{ opacity: 0.5 }}>[ </span>{quote.text}<span style={{ opacity: 0.5 }}> ]</span>
        </span>
        <div style={{ fontSize: 10, color: GREY, opacity: 0.4, marginTop: 6 }}>{quote.author}</div>
      </div>

      {/* Stats block */}
      <div style={{
        display: 'flex', background: DARK_CARD, borderRadius: 14,
        padding: '16px 8px', border: `1px solid ${CARD_BORDER}`, marginBottom: 8,
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: WHITE }}>
            {isStatsLoading ? '-' : (stats?.current_streak ?? 0)}
          </div>
          <div style={{ fontSize: 11, color: GREY, marginTop: 2 }}>серия</div>
        </div>
        <div style={{ width: 1, background: CARD_BORDER }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: WHITE }}>
            {isStatsLoading ? '-' : (stats?.total_practices ?? 0)}
          </div>
          <div style={{ fontSize: 11, color: GREY, marginTop: 2 }}>практики</div>
        </div>
        <div style={{ width: 1, background: CARD_BORDER }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: WHITE }}>
            {isStatsLoading ? '-' : (stats?.total_minutes ?? 0)}
          </div>
          <div style={{ fontSize: 11, color: GREY, marginTop: 2 }}>минуты</div>
        </div>
      </div>

      {/* Last practice */}
      <div style={{
        background: DARK_CARD, borderRadius: 14, border: `1px solid ${CARD_BORDER}`,
        padding: '12px 16px', marginBottom: 18,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: GREY, opacity: 0.6, marginBottom: 3 }}>последняя практика</div>
          <div style={{ fontSize: 13, color: WHITE }}>
            {lastPractice ? lastPractice.name : '—'}
          </div>
        </div>
        <div style={{ fontSize: 11, color: GREY, opacity: 0.5 }}>
          {lastPractice ? formatRelativeDate(lastPractice.date) : ''}
        </div>
      </div>

      {/* Connect Email — stub */}
      <div style={{
        background: DARK_CARD, borderRadius: 14, border: `1px solid ${CARD_BORDER}`,
        padding: '14px 16px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: GREY, opacity: 0.5, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>веб-доступ</div>
            <div style={{ fontSize: 13, color: GREY, opacity: 0.6 }}>email не привязан</div>
          </div>
          <button
            onClick={() => {/* Connect logic in next step */}}
            style={{
              fontSize: 11, fontWeight: 500, color: WHITE, background: TURF,
              border: 'none', borderRadius: 16, padding: '6px 12px', cursor: 'pointer',
            }}
          >
            Connect
          </button>
        </div>
      </div>

      {/* Menu */}
      <div style={{
        background: DARK_CARD, borderRadius: 14, border: `1px solid ${CARD_BORDER}`,
        overflow: 'hidden', marginBottom: 12,
      }}>
        {menuItems.map((item, i) => (
          <div
            key={i}
            onClick={item.onClick}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 16px', cursor: 'pointer',
              borderBottom: i < menuItems.length - 1 ? `1px solid ${CARD_BORDER}` : 'none',
            }}
          >
            <span style={{ fontSize: 14, color: WHITE }}>{item.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {item.sub && <span style={{ fontSize: 12, color: GREY, opacity: 0.6 }}>{item.sub}</span>}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREY} strokeWidth="1.5" opacity="0.4">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Close / Logout */}
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <span
          onClick={handleClose}
          style={{ fontSize: 13, color: GREY, opacity: 0.5, cursor: 'pointer' }}
        >
          {isTelegram ? 'закрыть' : 'выйти'}
        </span>
      </div>

      {/* ConnectEmailModal — kept for future use */}
      {isTelegram && user?.telegram_id && (
        <ConnectEmailModal
          isOpen={isConnectEmailOpen}
          telegramId={user.telegram_id}
          onClose={() => setIsConnectEmailOpen(false)}
          onSuccess={() => { void refreshUser() }}
        />
      )}
    </main>
  )
}
