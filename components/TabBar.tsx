'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'

interface TabBarProps {
  isPremium: boolean
}

function IconHome({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}

function IconMusic({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  )
}

function IconBook({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}

function IconHeart({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function IconCalendar({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

const TAB_ROUTES: Record<string, string> = {
  home: '/',
  catalog: '/catalog',
  theory: '/theory',
  favorites: '/favorites',
  schedule: '/schedule',
}

const ROUTE_TO_TAB: Record<string, string> = {
  '/': 'home',
  '/catalog': 'catalog',
  '/theory': 'theory',
  '/favorites': 'favorites',
  '/schedule': 'schedule',
}

export function TabBar({ isPremium }: TabBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { language } = useTranslation()

  const activeTab = (pathname && ROUTE_TO_TAB[pathname]) || 'home'

  const freeTabs = [
    { id: 'home',      label: language === 'ru' ? 'Главная'  : 'Home',      Icon: IconHome     },
    { id: 'catalog',   label: language === 'ru' ? 'Каталог'  : 'Catalog',   Icon: IconMusic    },
    { id: 'schedule',  label: language === 'ru' ? 'Расписание': 'Schedule',  Icon: IconCalendar },
    { id: 'favorites', label: language === 'ru' ? 'Избранное': 'Favorites', Icon: IconHeart    },
  ]

  const blackTabs = [
    { id: 'home',     label: language === 'ru' ? 'Главная'   : 'Home',      Icon: IconHome     },
    { id: 'catalog',  label: language === 'ru' ? 'Практики'  : 'Practices', Icon: IconMusic    },
    { id: 'theory',   label: language === 'ru' ? 'Теория'    : 'Theory',    Icon: IconBook     },
    { id: 'schedule', label: language === 'ru' ? 'Расписание': 'Schedule',  Icon: IconCalendar },
  ]

  const tabs = isPremium ? blackTabs : freeTabs
  const activeColor  = isPremium ? '#54C68C' : '#CBCBCB'
  const activeBg     = isPremium ? 'rgba(84,198,140,0.14)' : 'rgba(203,203,203,0.12)'
  const inactiveColor = '#6b7280'

  return (
    <div style={{ position: 'fixed', bottom: 12, left: 12, right: 12, zIndex: 50 }}>
      <div style={{
        background: 'rgba(22,22,24,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 30,
        padding: '8px 4px 7px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        boxShadow: '0 4px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id
          const color = active ? activeColor : inactiveColor
          return (
            <button
              key={id}
              onClick={() => { if (TAB_ROUTES[id]) router.push(TAB_ROUTES[id]) }}
              style={{
                background: active ? activeBg : 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 22,
                padding: '7px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                transition: 'all 0.2s ease',
              }}
            >
              <Icon color={color} />
              <span style={{ fontSize: 9, fontWeight: 600, color }}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
