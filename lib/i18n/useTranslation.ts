'use client'

import { useContext } from 'react'
import { LanguageContext } from './context'
import type { Translations, TranslationKey } from './types'

/**
 * Resolve a dot-path key (e.g. "profile.streak") to the corresponding string
 * value inside the translations object.
 */
function resolve(obj: Translations, path: string): string {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return path
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : path
}

export function useTranslation() {
  const { language, setLanguage, translations } = useContext(LanguageContext)

  /** Get a translated string by dot-path key, e.g. t('profile.streak') */
  function t(key: TranslationKey): string {
    return resolve(translations, key)
  }

  return { t, language, setLanguage } as const
}
