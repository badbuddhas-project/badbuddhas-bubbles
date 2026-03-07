'use client'

/**
 * Home page: practice catalog with category/language filters and favorites.
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { usePractices } from '@/hooks/usePractices'
import { useFavorites } from '@/hooks/useFavorites'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useTranslation } from '@/lib/i18n'
import { PracticeCard } from '@/components/PracticeCard'
import { FilterDropdown, FilterButton } from '@/components/FilterDropdown'
import type { Practice, PracticeCategory } from '@/types/database'
import { ymEvent, getPlatform } from '@/lib/analytics'

type CategoryFilter = 'all' | 'premium' | PracticeCategory
type LanguageFilter = 'all' | 'ru' | 'en'

export default function Home() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { user, isLoading: isUserLoading } = useUser()
  const { practices, isLoading: isPracticesLoading } = usePractices()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { isCompleted: isOnboardingCompleted, isLoading: isOnboardingLoading } = useOnboarding()

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!isOnboardingLoading && !isOnboardingCompleted) {
      router.replace('/onboarding')
    }
  }, [isOnboardingCompleted, isOnboardingLoading, router])

  // Analytics: practice list viewed
  useEffect(() => {
    if (!isPracticesLoading && practices.length > 0) {
      ymEvent('practice_list_viewed', { platform: getPlatform() })
    }
  }, [isPracticesLoading, practices.length])

  const isPremium = user?.is_premium ?? false

  const allCategoryOptions = useMemo(() => [
    { value: 'all', label: t('catalog.allPractices') },
    { value: 'premium', label: t('catalog.premium') },
    { value: 'relax', label: t('catalog.relax') },
    { value: 'balance', label: t('catalog.balance') },
    { value: 'energize', label: t('catalog.energize') },
  ], [t])

  const categoryOptions = useMemo(
    () => isPremium ? allCategoryOptions : allCategoryOptions.filter((o) => o.value !== 'premium'),
    [isPremium, allCategoryOptions],
  )

  const languageOptions = useMemo(() => [
    { value: 'all', label: t('catalog.allLanguages') },
    { value: 'ru', label: t('catalog.russian') },
    { value: 'en', label: t('catalog.english') },
  ], [t])

  const LANG_FILTER_KEY = 'badbuddhas-practice-lang-filter'

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>(() => {
    if (typeof window === 'undefined') return 'all'
    const saved = localStorage.getItem(LANG_FILTER_KEY)
    if (saved === 'all' || saved === 'ru' || saved === 'en') return saved
    return language as LanguageFilter
  })
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const handleLanguageFilterChange = useCallback((v: string) => {
    const value = v as LanguageFilter
    setLanguageFilter(value)
    localStorage.setItem(LANG_FILTER_KEY, value)
  }, [])

  const filteredPractices = useMemo(() => {
    return practices.filter((practice) => {
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'premium') {
          if (!practice.is_premium) return false
        } else if (practice.category !== categoryFilter) {
          return false
        }
      }
      if (languageFilter !== 'all' && practice.language && practice.language !== languageFilter) {
        return false
      }
      if (showFavoritesOnly && !isFavorite(practice.id)) {
        return false
      }
      return true
    })
  }, [practices, categoryFilter, languageFilter, showFavoritesOnly, isFavorite])

  const handlePracticeClick = (practice: Practice) => {
    router.push(`/practice/${practice.id}`)
  }

  const handleProfileClick = () => {
    router.push('/profile')
  }

  if (isUserLoading || isOnboardingLoading || !isOnboardingCompleted) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">{t('common.loading')}</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-8">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4">
        <div className="text-lg font-bold tracking-wide text-white">
          BADBUDDHAS
        </div>
        <button
          onClick={handleProfileClick}
          className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center"
        >
          {user?.first_name ? (
            <span className="text-white font-medium text-sm">
              {user.first_name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <UserIcon className="w-5 h-5 text-white" />
          )}
        </button>
      </header>

      {/* Greeting */}
      <section className="px-4 mt-2 mb-6">
        <p className="text-sm text-zinc-500">{t('catalog.hi')}{user?.first_name ? ` ${user.first_name}` : ''}</p>
        <h1 className="text-2xl font-bold text-white" data-testid="greeting-heading">{t('catalog.letsBreath')}</h1>
      </section>

      {/* Filters */}
      <section className="px-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <FilterDropdown
            options={categoryOptions}
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v as CategoryFilter)}
          />
          <FilterDropdown
            options={languageOptions}
            value={languageFilter}
            onChange={handleLanguageFilterChange}
          />
          <FilterButton
            isActive={showFavoritesOnly}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <HeartIcon className="w-5 h-5" filled={showFavoritesOnly} />
          </FilterButton>
        </div>
      </section>

      {/* Practice List */}
      <section className="px-4">
        {isPracticesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-zinc-900/50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredPractices.length > 0 ? (
          <div className="space-y-3">
            {filteredPractices.map((practice) => (
              <PracticeCard
                key={practice.id}
                practice={practice}
                isFavorite={isFavorite(practice.id)}
                onToggleFavorite={toggleFavorite}
                onClick={handlePracticeClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-zinc-500">
              {showFavoritesOnly
                ? t('catalog.noFavorites')
                : t('catalog.noPractices')}
            </p>
          </div>
        )}
      </section>

    </main>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function HeartIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  )
}
