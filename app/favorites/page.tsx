'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { usePractices } from '@/hooks/usePractices'
import { useFavorites } from '@/hooks/useFavorites'
import { useTranslation } from '@/lib/i18n'
import BreathVisual from '@/components/BreathVisual'
import { BrandMark } from '@/components/BrandMark'
import { TabBar } from '@/components/TabBar'
import type { Practice } from '@/types/database'

const C = {
  bg: '#000',
  card: '#0A0A0A',
  border: '#1A1A1A',
  white: '#fff',
  text: '#CBCBCB',
  sub: 'rgba(203,203,203,0.45)',
  slow: '#8b5cf6',
  ground: '#3b82f6',
  rise: '#ec4899',
}

const CAT_COLORS: Record<string, string> = { relax: C.slow, balance: C.ground, energize: C.rise }
const CAT_DISPLAY: Record<string, string> = { relax: 'SLOW', balance: 'GROUND', energize: 'RISE' }

export default function FavoritesPage() {
  const router = useRouter()
  const { user } = useUser()
  const { practices, isLoading } = usePractices()
  const { favoriteIds } = useFavorites()
  const { language } = useTranslation()
  const isPremium = user?.is_premium ?? false

  const favPractices = useMemo(
    () => practices.filter(p => favoriteIds.has(p.id)),
    [practices, favoriteIds]
  )

  const handleTap = (p: Practice) => {
    router.push(`/practice/${p.id}?from=favorites`)
  }

  return (
    <main style={{ minHeight: '100vh', background: C.bg, overflowY: 'auto', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '44px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.white }}>
          {language === 'ru' ? 'Избранное' : 'Favorites'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <BrandMark size={16} />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
        </div>
      ) : favPractices.length === 0 ? (
        /* Empty state */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: 16, opacity: 0.5 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <div style={{ fontSize: 14, color: C.sub, textAlign: 'center' }}>
            {language === 'ru' ? 'Пока нет избранных практик' : 'No favorite practices yet'}
          </div>
        </div>
      ) : (
        <div style={{ padding: '4px 16px' }}>
          {favPractices.map(p => {
              const catColor = CAT_COLORS[p.category] || C.slow
              const mins = Math.floor(p.duration_seconds / 60)
              return (
                <div
                  key={p.id}
                  onClick={() => handleTap(p)}
                  style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ flexShrink: 0, width: 60, height: 60, borderRadius: 14, overflow: 'hidden' }}>
                    <BreathVisual category={p.category} size={60} borderRadius={12} animate={false} showBubbles={false} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                      {p.title_ru || p.title}
                    </div>
                    <div style={{ fontSize: 11, color: C.sub }}>
                      <span style={{ color: catColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, fontSize: 9 }}>
                        {CAT_DISPLAY[p.category] ?? p.category}
                      </span>
                      {' · '}{mins} мин · {p.instructor_name}
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      <TabBar isPremium={isPremium} />
    </main>
  )
}
