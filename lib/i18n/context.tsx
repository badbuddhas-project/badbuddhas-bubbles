'use client'

import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { en } from './translations/en'
import { ru } from './translations/ru'
import type { Translations } from './types'

export type Language = 'ru' | 'en'

const STORAGE_KEY = 'badbuddhas-language'

const translationsMap: Record<Language, Translations> = { en, ru }

export interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  translations: Translations
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'ru',
  setLanguage: () => {},
  translations: ru,
})

function detectLanguage(): Language {
  // 1. Check localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'ru') return stored
  }

  // 2. Check Telegram user language
  if (typeof window !== 'undefined') {
    const tg = (window as any).Telegram?.WebApp
    const langCode = tg?.initDataUnsafe?.user?.language_code as string | undefined
    if (langCode) {
      return langCode === 'ru' ? 'ru' : 'en'
    }
  }

  // 3. Default to Russian
  return 'ru'
}

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('ru')
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setLanguageState(detectLanguage())
    setIsHydrated(true)
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }, [])

  const translations = translationsMap[language]

  // Avoid hydration mismatch by rendering with default language until client-side detection runs
  if (!isHydrated) {
    return (
      <LanguageContext.Provider value={{ language: 'ru', setLanguage, translations: ru }}>
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  )
}
