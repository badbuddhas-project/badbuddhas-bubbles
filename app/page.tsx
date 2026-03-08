'use client'

/**
 * Home page: practice catalog with filters and favorites.
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { usePractices } from '@/hooks/usePractices'
import { useFavorites } from '@/hooks/useFavorites'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useTranslation } from '@/lib/i18n'
import { PracticeCard } from '@/components/PracticeCard'
import { BrandMark } from '@/components/BrandMark'
import type { Practice, PracticeCategory } from '@/types/database'
import { ymEvent, getPlatform } from '@/lib/analytics'

const CAT_COLORS: Record<string, string> = {
  relax: '#8b5cf6',
  balance: '#3b82f6',
  energize: '#ec4899',
}

type CategoryFilter = 'all' | PracticeCategory
type LanguageFilter = 'all' | 'ru' | 'en'
type DurationFilter = 'all' | 'up5' | 'up10' | 'from10'

export default function Home() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { user, isLoading: isUserLoading } = useUser()
  const { practices, isLoading: isPracticesLoading } = usePractices()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { isCompleted: isOnboardingCompleted, isLoading: isOnboardingLoading } = useOnboarding()

  useEffect(() => {
    if (!isOnboardingLoading && !isOnboardingCompleted) {
      router.replace('/onboarding')
    }
  }, [isOnboardingCompleted, isOnboardingLoading, router])

  useEffect(() => {
    if (!isPracticesLoading && practices.length > 0) {
      ymEvent('practice_list_viewed', { platform: getPlatform() })
    }
  }, [isPracticesLoading, practices.length])

  const LANG_FILTER_KEY = 'badbuddhas-practice-lang-filter'

  const [filterOpen, setFilterOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('all')
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all')
  const [instructorFilter, setInstructorFilter] = useState<string>('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const handleLanguageFilterChange = useCallback((v: LanguageFilter) => {
    setLanguageFilter(v)
    localStorage.setItem(LANG_FILTER_KEY, v)
  }, [])

  const instructors = useMemo(() => {
    const set = new Set<string>()
    practices.forEach((p) => set.add(p.instructor_name))
    return Array.from(set).sort()
  }, [practices])

  const hasActiveFilters = categoryFilter !== 'all' || durationFilter !== 'all' || instructorFilter !== 'all' || languageFilter !== 'all'

  const filterLabel = useMemo(() => {
    if (!hasActiveFilters) return t('catalog.allPractices')
    const parts: string[] = []
    if (categoryFilter !== 'all') parts.push(t(`catalog.${categoryFilter}`))
    if (durationFilter !== 'all') {
      const dLabels: Record<string, string> = { up5: t('catalog.upTo5min'), up10: t('catalog.upTo10min'), from10: t('catalog.from10min') }
      parts.push(dLabels[durationFilter])
    }
    if (instructorFilter !== 'all') parts.push(instructorFilter)
    if (languageFilter !== 'all') parts.push(languageFilter === 'ru' ? t('catalog.russian') : t('catalog.english'))
    return parts.join(' · ')
  }, [hasActiveFilters, categoryFilter, durationFilter, instructorFilter, languageFilter, t])

  const isPremium = user?.is_premium ?? false

  const filteredPractices = useMemo(() => {
    return practices.filter((practice) => {
      // Hide premium practices from free users
      if (!isPremium && practice.is_premium) return false
      if (categoryFilter !== 'all' && practice.category !== categoryFilter) return false
      if (languageFilter !== 'all' && practice.language && practice.language !== languageFilter) return false
      if (showFavoritesOnly && !isFavorite(practice.id)) return false
      if (instructorFilter !== 'all' && practice.instructor_name !== instructorFilter) return false
      if (durationFilter !== 'all') {
        const mins = practice.duration_seconds / 60
        if (durationFilter === 'up5' && mins > 5) return false
        if (durationFilter === 'up10' && mins > 10) return false
        if (durationFilter === 'from10' && mins < 10) return false
      }
      return true
    })
  }, [practices, isPremium, categoryFilter, languageFilter, showFavoritesOnly, isFavorite, instructorFilter, durationFilter])

  const handlePracticeClick = (practice: Practice) => {
    router.push(`/practice/${practice.id}`)
  }

  const handleProfileClick = () => {
    router.push('/profile')
  }

  if (isUserLoading || isOnboardingLoading || !isOnboardingCompleted) {
    return (
      <main style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main style={{ background: '#000', minHeight: '100vh', padding: '44px 16px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <BrandMark size={22} />
        <button
          onClick={handleProfileClick}
          style={{ width: 32, height: 32, borderRadius: '50%', background: '#313333', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1A1A1A', cursor: 'pointer', padding: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBCBCB" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      </div>

      {/* Greeting */}
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 17, fontWeight: 500, color: '#fff' }}>
          {t('catalog.hi')}{user?.first_name ? ` ${user.first_name}` : ''}
        </span>
      </div>
      <div style={{ fontSize: 14, color: '#CBCBCB', opacity: 0.5, marginBottom: 20 }}>
        [{t('catalog.letsBreath').toLowerCase()}]
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: filterOpen ? 12 : 0 }}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            style={{
              flex: 1,
              background: '#313333',
              border: '1px solid #1A1A1A',
              borderRadius: 24,
              padding: '10px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filterLabel}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CBCBCB" strokeWidth="2" opacity="0.6" style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            style={{
              width: 42,
              height: 42,
              background: 'transparent',
              border: `1px solid ${showFavoritesOnly ? '#CBCBCB' : '#1A1A1A'}`,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={showFavoritesOnly ? '#CBCBCB' : 'none'} stroke="#CBCBCB" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Expandable filter panel */}
        {filterOpen && (
          <div style={{ background: '#0A0A0A', borderRadius: 16, border: '1px solid #1A1A1A', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Duration */}
            <FilterGroup label={t('catalog.duration')}>
              {([
                { value: 'all', label: t('catalog.all') },
                { value: 'up5', label: t('catalog.upTo5min') },
                { value: 'up10', label: t('catalog.upTo10min') },
                { value: 'from10', label: t('catalog.from10min') },
              ] as const).map((d) => (
                <Chip key={d.value} active={durationFilter === d.value} onClick={() => setDurationFilter(d.value as DurationFilter)}>{d.label}</Chip>
              ))}
            </FilterGroup>

            {/* Category */}
            <FilterGroup label={t('catalog.category')}>
              {([
                { value: 'all', label: t('catalog.all') },
                { value: 'relax', label: t('catalog.relax') },
                { value: 'balance', label: t('catalog.balance') },
                { value: 'energize', label: t('catalog.energize') },
              ] as const).map((c) => (
                <Chip key={c.value} active={categoryFilter === c.value} onClick={() => setCategoryFilter(c.value as CategoryFilter)}>{c.label}</Chip>
              ))}
            </FilterGroup>

            {/* Instructor */}
            <FilterGroup label={t('catalog.instructor')}>
              <Chip active={instructorFilter === 'all'} onClick={() => setInstructorFilter('all')}>{t('catalog.all')}</Chip>
              {instructors.map((name) => (
                <Chip key={name} active={instructorFilter === name} onClick={() => setInstructorFilter(name)}>{name}</Chip>
              ))}
            </FilterGroup>

            {/* Language */}
            <FilterGroup label={t('catalog.language')}>
              {([
                { value: 'all', label: t('catalog.all') },
                { value: 'ru', label: t('catalog.russian') },
                { value: 'en', label: t('catalog.english') },
              ] as const).map((l) => (
                <Chip key={l.value} active={languageFilter === l.value} onClick={() => handleLanguageFilterChange(l.value as LanguageFilter)}>{l.label}</Chip>
              ))}
            </FilterGroup>
          </div>
        )}
      </div>

      {/* Practice list */}
      {isPracticesLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-zinc-900/50 animate-pulse" />
          ))}
        </div>
      ) : filteredPractices.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredPractices.map((practice, i) => (
            <div key={practice.id}>
              <PracticeCard
                practice={practice}
                isFavorite={isFavorite(practice.id)}
                onToggleFavorite={toggleFavorite}
                onClick={handlePracticeClick}
                catColors={CAT_COLORS}
              />
              {i < filteredPractices.length - 1 && (
                <div style={{ height: 1, background: '#1A1A1A', marginLeft: 92 }} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <span style={{ fontSize: 14, color: '#CBCBCB', opacity: 0.5 }}>
            {showFavoritesOnly ? t('catalog.noFavorites') : t('catalog.noPractices')}
          </span>
        </div>
      )}
    </main>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#CBCBCB', opacity: 0.5, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        color: active ? '#fff' : '#CBCBCB',
        background: active ? '#313333' : 'transparent',
        border: `1px solid ${active ? 'rgba(203,203,203,0.2)' : '#1A1A1A'}`,
        borderRadius: 16,
        padding: '5px 12px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
