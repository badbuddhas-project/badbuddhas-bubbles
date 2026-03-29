'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'
import { useUserStats } from '@/hooks/useUserStats'
import { ConnectEmailModal } from '@/components/ConnectEmailModal'
import { BrandMark } from '@/components/BrandMark'
import { useTranslation } from '@/lib/i18n'
import { ymEvent, getPlatform } from '@/lib/analytics'
import { closeTelegramApp } from '@/lib/telegram'

const C = {
  bg: '#000',
  card: '#0A0A0A',
  border: '#1A1A1A',
  white: '#fff',
  text: '#CBCBCB',
  sub: 'rgba(203,203,203,0.45)',
  green: '#54C68C',
  pink: '#C034A5',
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading: isUserLoading, isTelegram, signOut, refreshUser } = useUser()
  const { stats, isLoading: isStatsLoading } = useUserStats()
  const { t, language } = useTranslation()

  const [isConnectEmailOpen, setIsConnectEmailOpen] = useState(false)
  const [lastPractice, setLastPractice] = useState<{ name: string; date: string } | null>(null)
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<string | null>(null)

  useEffect(() => {
    ymEvent('profile_viewed', { platform: getPlatform() })
  }, [])

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
        setLastPractice({ name: practice.title_ru || practice.title, date: data.completed_at })
      }
    }
    fetchLastPractice()
  }, [user])

  useEffect(() => {
    if (!user?.is_premium) return
    const fetchSub = async () => {
      try {
        const tgId = user.telegram_id ? `?telegram_id=${user.telegram_id}` : ''
        const res = await fetch(`/api/subscriptions/me${tgId}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.expires_at) setSubscriptionExpiry(data.expires_at)
        }
      } catch (err) {
        console.error('[Profile] fetchSub error:', err)
      }
    }
    fetchSub()
  }, [user])

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t('profile.today')
    if (diffDays === 1) return t('profile.yesterday')
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' })
  }

  const formatJoinDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
    if (months < 1) return language === 'ru' ? 'только что' : 'just joined'
    if (months === 1) return language === 'ru' ? '1 месяц назад' : '1 month ago'
    if (months < 12) return language === 'ru' ? `${months} месяцев назад` : `${months} months ago`
    const years = Math.floor(months / 12)
    return language === 'ru' ? `${years} год назад` : `${years} year ago`
  }

  const handleLogout = async () => { await signOut() }

  const handleClose = () => {
    if (isTelegram) closeTelegramApp()
    else handleLogout()
  }

  const handleDisconnectEmail = async () => {
    if (!user) return
    try {
      const supabase = getSupabaseClient()
      await supabase.from('users').update({ email: null, email_confirmed_at: null, password_hash: null }).eq('id', user.id)
      await refreshUser()
    } catch (err) {
      console.error('Failed to disconnect email:', err)
    }
  }

  const isPremium = user?.is_premium ?? false
  const displayName = user?.first_name || user?.username || user?.email?.split('@')[0] || 'User'

  const daysUntilExpiry = subscriptionExpiry
    ? Math.ceil((new Date(subscriptionExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const showRenewalWarning = isPremium && daysUntilExpiry !== null && daysUntilExpiry < 7

  const formatExpiryLine = (dateStr: string) => {
    const date = new Date(dateStr)
    const monthsLeft = Math.max(0, Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
    const formatted = date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return language === 'ru' ? `до ${formatted} · ${monthsLeft} месяцев` : `until ${formatted} · ${monthsLeft} months`
  }

  const freeMenuItems = [
    { label: t('profile.settings'), sub: t('profile.account'), onClick: () => router.push('/profile/settings'), red: false },
    { label: t('profile.faq'), sub: '', onClick: () => router.push('/profile/faq'), red: false },
    { label: t('profile.communityChat'), sub: '', onClick: () => window.open('https://t.me/+bb3fiUmoKGVjYmUy', '_blank'), red: false },
    { label: t('profile.contactUs'), sub: '', onClick: () => window.open('https://badbuddhas.world/ask?utm_source=telegram&utm_medium=miniapp&utm_campaign=bubbles_contact', '_blank'), red: false },
  ]
  const blackMenuItems = [
    { label: language === 'ru' ? 'Настройки' : 'Settings', sub: t('profile.account'), onClick: () => router.push('/profile/settings'), red: false },
    { label: language === 'ru' ? 'Уведомления' : 'Notifications', sub: '', onClick: () => router.push('/profile/settings'), red: false },
    { label: language === 'ru' ? 'Поддержка' : 'Support', sub: '', onClick: () => window.open('https://badbuddhas.world/ask?utm_source=telegram&utm_medium=miniapp&utm_campaign=bubbles_contact', '_blank'), red: false },
    { label: language === 'ru' ? 'Выйти' : 'Sign out', sub: '', onClick: handleLogout, red: true },
  ]
  const menuItems = isPremium ? blackMenuItems : freeMenuItems

  if (isUserLoading) {
    return (
      <main style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#71717a' }}>{t('common.loading')}</div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: C.bg, overflowY: 'auto', paddingBottom: 40 }}>

      {/* Header: back left, logo right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '44px 16px 12px' }}>
        <button
          onClick={() => router.push('/')}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CBCBCB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <BrandMark size={16} />
        </div>
      </div>

      {/* Avatar row: avatar left + meta right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '8px 20px 24px' }}>
        {/* Avatar with progress ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="88" height="88" viewBox="0 0 88 88" style={{ position: 'absolute', top: -4, left: -4, zIndex: 2 }}>
            <circle cx="44" cy="44" r="40" fill="none" stroke={C.border} strokeWidth="3.5" />
            <circle
              cx="44" cy="44" r="40" fill="none"
              stroke={isPremium ? C.pink : C.green} strokeWidth="3.5"
              strokeDasharray={isPremium ? '230 251' : '180 251'} strokeLinecap="round"
              transform="rotate(-90 44 44)"
            />
          </svg>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: isPremium ? `linear-gradient(135deg,${C.pink},${C.green})` : 'linear-gradient(135deg,#8b5cf6,#3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 1,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-white-square.png" alt="" width={30} height={30} style={{ display: 'block', opacity: 0.9 }} />
          </div>
          {isPremium && (
            <div style={{ position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)', zIndex: 3, background: C.pink, borderRadius: 6, padding: '2px 7px' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: 1.5 }}>BLACK</span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>
            {language === 'ru' ? 'Участник' : 'Member'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 6 }}>
            {user?.created_at ? formatJoinDate(user.created_at) : '—'}
          </div>
          {isPremium ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.pink, marginBottom: 2 }}>bubbles [black]</div>
              {subscriptionExpiry && (
                <div style={{ fontSize: 11, color: C.sub }}>{formatExpiryLine(subscriptionExpiry)}</div>
              )}
            </>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>bubbles</span>
          )}
        </div>
      </div>

      {/* Big name */}
      <div style={{ fontSize: 34, fontWeight: 800, color: C.white, padding: '0 20px 20px', marginTop: -10 }}>
        {displayName}
      </div>

      {/* Stats card */}
      <div style={{ margin: '0 16px 18px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, display: 'flex' }}>
        {[
          { label: t('profile.streak'), value: isStatsLoading ? '—' : String(stats?.current_streak ?? 0) },
          { label: t('profile.practices'), value: isStatsLoading ? '—' : String(stats?.total_practices ?? 0) },
          { label: t('profile.minutes'), value: isStatsLoading ? '—' : String(stats?.total_minutes ?? 0) },
        ].map((s, i) => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '16px 0', borderRight: i < 2 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.sub }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Black CTA — free users only */}
      {!isPremium && (
        <div
          onClick={() => router.push('/subscribe')}
          style={{ margin: '0 16px 18px', borderRadius: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1a0030,#2d0050,#1a1a00)' }} />
          <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(192,52,165,0.5) 0%,transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: 20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(84,198,140,0.25) 0%,transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, padding: '20px 18px' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'inline-flex', background: `linear-gradient(135deg,${C.pink},#7b1fa2)`, borderRadius: 20, padding: '3px 12px', marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: 2 }}>BLACK</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 500, color: C.white, lineHeight: 1.2, marginBottom: 6 }}>
                {language === 'ru' ? 'Ещё 10+ практик' : '10+ more practices'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                {language === 'ru' ? 'Живые сессии, теория и эксклюзивный контент для подписчиков' : 'Live sessions, theory and exclusive content for subscribers'}
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); router.push('/subscribe') }}
              style={{ width: '100%', fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg,${C.pink},#7b1fa2)`, color: '#fff', border: 'none', borderRadius: 14, padding: '13px', cursor: 'pointer', boxShadow: '0 6px 24px rgba(192,52,165,0.5)' }}
            >
              {language === 'ru' ? 'Открыть [black]' : 'Open [black]'}
            </button>
          </div>
        </div>
      )}

      {/* Renewal warning — premium users, < 7 days until expiry */}
      {showRenewalWarning && subscriptionExpiry && (
        <div style={{ margin: '0 16px 18px', borderRadius: 16, padding: '16px', background: 'rgba(192,52,165,0.10)', border: '1px solid rgba(192,52,165,0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.pink, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                {language === 'ru' ? 'Подписка истекает' : 'Subscription expiring'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                {language === 'ru'
                  ? `Осталось ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'день' : 'дня'} · до ${new Date(subscriptionExpiry).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                  : `${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} left · until ${new Date(subscriptionExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                }
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" opacity="0.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 2h14M5 22h14M6 2v6l4 4-4 4v6M18 2v6l-4 4 4 4v6"/>
            </svg>
          </div>
          <button
            onClick={() => router.push('/subscribe')}
            style={{ width: '100%', fontSize: 13, fontWeight: 700, color: '#fff', background: `linear-gradient(135deg,${C.pink},#7b1fa2)`, border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer' }}
          >
            {language === 'ru' ? 'Продлить доступ' : 'Renew access'}
          </button>
        </div>
      )}

      {/* Last practice */}
      {lastPractice && (
        <div style={{ padding: '0 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
              {language === 'ru' ? 'Последняя практика' : 'Last practice'}
            </span>
          </div>
          <div
            onClick={() => router.push('/')}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 14, color: C.text }}>{lastPractice.name}</span>
            <span style={{ fontSize: 12, color: C.sub }}>{formatRelativeDate(lastPractice.date)}</span>
          </div>
        </div>
      )}

      {/* Web access (email connect) — kept for existing functionality */}
      {!(isTelegram && !isPremium) && (
        <div style={{ margin: '0 16px 18px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.sub, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{t('profile.webAccess')}</div>
              {user?.email ? (
                <div style={{ fontSize: 13, color: C.text, opacity: 0.7 }}>
                  {user.email_confirmed_at ? '✅ ' : '✉️ '}{user.email}
                  {!user.email_confirmed_at && (
                    <span style={{ display: 'block', fontSize: 11, opacity: 0.5, marginTop: 2 }}>{t('profile.emailNotConfirmed')}</span>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.sub }}>{t('profile.emailNotLinked')}</div>
              )}
            </div>
            {!user?.email ? (
              <button
                onClick={() => setIsConnectEmailOpen(true)}
                style={{ fontSize: 11, fontWeight: 500, color: C.white, background: '#313333', border: 'none', borderRadius: 16, padding: '6px 12px', cursor: 'pointer' }}
              >
                Connect
              </button>
            ) : user.email_confirmed_at ? (
              <button
                onClick={handleDisconnectEmail}
                style={{ fontSize: 11, color: C.text, opacity: 0.5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 16, padding: '6px 12px', cursor: 'pointer' }}
              >
                {t('profile.disconnectEmail')}
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Menu */}
      <div style={{ margin: '0 16px 20px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {menuItems.map((item, i) => (
          <div
            key={item.label}
            onClick={item.onClick}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < menuItems.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 15, color: item.red ? '#e04040' : C.white }}>{item.label}</span>
            {!item.red && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.sub && <span style={{ fontSize: 13, color: C.sub }}>{item.sub}</span>}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="1.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Close / Logout */}
      <div style={{ textAlign: 'center', paddingBottom: 32 }}>
        <span
          onClick={handleClose}
          style={{ fontSize: 14, color: C.sub, opacity: 0.55, cursor: 'pointer' }}
        >
          {isTelegram ? t('profile.closeApp').toLowerCase() : t('profile.logout').toLowerCase()}
        </span>
      </div>

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
