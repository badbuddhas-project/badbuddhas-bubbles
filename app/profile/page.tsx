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

const QUOTE_KEYS = [1, 2, 3, 4, 5] as const

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

  // Random quote index, stable per mount
  const [quoteIdx] = useState(() => QUOTE_KEYS[Math.floor(Math.random() * QUOTE_KEYS.length)])

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
    if (diffDays === 0) return t('profile.today')
    if (diffDays === 1) return t('profile.yesterday')
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

  const isPremium = user?.is_premium ?? false
  const displayName = user?.first_name || user?.username || user?.email?.split('@')[0] || 'User'

  const menuItems = [
    { label: t('profile.settings'), sub: t('profile.account'), onClick: () => router.push('/profile/settings') },
    { label: t('profile.faq'), sub: '', onClick: () => router.push('/profile/faq') },
    { label: t('profile.communityChat'), sub: '', onClick: () => window.open('https://t.me/+bb3fiUmoKGVjYmUy', '_blank') },
    { label: t('profile.contactUs'), sub: '', onClick: () => window.open('https://badbuddhas.world/ask?utm_source=telegram&utm_medium=miniapp&utm_campaign=bubbles_contact', '_blank') },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            onClick={() => router.push('/')}
            style={{
              width: 32, height: 32, borderRadius: '50%', background: DARK_CARD,
              border: `1px solid ${CARD_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREY} strokeWidth="1.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 500, color: WHITE }}>{t('profile.title')}</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-white.svg" alt="badbuddhas" height={16} style={{ display: 'block', height: '16px', width: 'auto' }} />
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 6, position: 'relative' }}>
        {isPremium && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/images/black_blob_5.png"
            alt=""
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 200,
              opacity: 0.4, zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        )}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', marginBottom: 10,
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${CARD_BORDER}`, position: 'relative', zIndex: 1,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-white-square.png" alt="" width={28} height={28} style={{ display: 'block', opacity: 0.9 }} />
        </div>
      </div>

      {/* Name */}
      <div style={{ textAlign: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 18, fontWeight: 500, color: WHITE }}>{displayName}</span>
      </div>

      {/* Account type */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: GREY }}>{isPremium ? t('profile.premiumAccount').toLowerCase() : t('profile.freeAccount').toLowerCase()}</span>
      </div>

      {/* Motivational quote */}
      <div style={{ textAlign: 'center', marginBottom: 18, padding: '0 12px' }}>
        <span style={{ fontSize: 12, color: GREY }}>
          <span style={{ opacity: 0.5 }}>[</span>{t(`quotes.q${quoteIdx}text` as any)}<span style={{ opacity: 0.5 }}>]</span>
        </span>
        <div style={{ fontSize: 10, color: GREY, opacity: 0.4, marginTop: 6 }}>{t(`quotes.q${quoteIdx}author` as any)}</div>
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
          <div style={{ fontSize: 11, color: GREY, marginTop: 2 }}>{t('profile.streak').toLowerCase()}</div>
        </div>
        <div style={{ width: 1, background: CARD_BORDER }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: WHITE }}>
            {isStatsLoading ? '-' : (stats?.total_practices ?? 0)}
          </div>
          <div style={{ fontSize: 11, color: GREY, marginTop: 2 }}>{t('profile.practices').toLowerCase()}</div>
        </div>
        <div style={{ width: 1, background: CARD_BORDER }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: WHITE }}>
            {isStatsLoading ? '-' : (stats?.total_minutes ?? 0)}
          </div>
          <div style={{ fontSize: 11, color: GREY, marginTop: 2 }}>{t('profile.minutes').toLowerCase()}</div>
        </div>
      </div>

      {/* Last practice */}
      <div
        onClick={() => router.push('/')}
        style={{
          background: DARK_CARD, borderRadius: 14, border: `1px solid ${CARD_BORDER}`,
          padding: '12px 16px', marginBottom: 18,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: GREY, opacity: 0.6, marginBottom: 3 }}>{t('profile.lastPractice').toLowerCase()}</div>
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
            <div style={{ fontSize: 11, color: GREY, opacity: 0.5, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>{t('profile.webAccess')}</div>
            <div style={{ fontSize: 13, color: GREY, opacity: 0.6 }}>{t('profile.emailNotLinked')}</div>
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
          {isTelegram ? t('profile.closeApp').toLowerCase() : t('profile.logout').toLowerCase()}
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
