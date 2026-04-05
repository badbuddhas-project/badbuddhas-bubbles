'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { getSupabaseClient } from '@/lib/supabase'
import { useTranslation } from '@/lib/i18n'
import { ymEvent } from '@/lib/analytics'

const DARK_CARD = '#0A0A0A'
const CARD_BORDER = '#1A1A1A'
const GREY = '#CBCBCB'
const WHITE = '#FFFFFF'

export default function SettingsPage() {
  const router = useRouter()
  const { user, refreshUser } = useUser()
  const { t, language, setLanguage } = useTranslation()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedLang, setSelectedLang] = useState(language)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
    }
  }, [user])

  const handleBack = () => {
    router.back()
  }

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      // Save name changes to Supabase
      if (firstName !== (user.first_name || '') || lastName !== (user.last_name || '')) {
        const supabase = getSupabaseClient()
        await supabase
          .from('users')
          .update({
            first_name: firstName.trim() || null,
            last_name: lastName.trim() || null,
          })
          .eq('id', user.id)
        await refreshUser()
      }

      // Apply language change
      if (selectedLang !== language) {
        setLanguage(selectedLang)
        ymEvent('language_changed', { language: selectedLang })
      }

      // Show feedback
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 1200)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges =
    firstName !== (user?.first_name || '') ||
    lastName !== (user?.last_name || '') ||
    selectedLang !== language

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800">
        <button
          onClick={handleBack}
          style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CBCBCB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <h1 className="text-lg font-semibold text-white">{t('settings.title')}</h1>

        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            hasChanges && !isSaving
              ? 'text-emerald-300'
              : 'text-zinc-600'
          }`}
        >
          {showSaved ? t('settings.saved') : isSaving ? t('settings.saving') : t('common.save')}
        </button>
      </header>

      {/* Form */}
      <section className="p-4 space-y-4">
        {/* First Name */}
        <div>
          <label className="block text-sm text-zinc-500 mb-2">
            {t('settings.firstName')}
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t('settings.firstNamePlaceholder')}
            className="w-full px-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-300/50"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm text-zinc-500 mb-2">
            {t('settings.lastName')}
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t('settings.lastNamePlaceholder')}
            className="w-full px-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-300/50"
          />
        </div>

      </section>

      {/* Language */}
      <section className="p-4">
        <div style={{ fontSize: 10, color: GREY, opacity: 0.5, textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: 8 }}>
          {t('settings.language') || 'ЯЗЫК'}
        </div>
        <div style={{ background: DARK_CARD, borderRadius: 14, border: `1px solid ${CARD_BORDER}`, overflow: 'hidden' }}>
          {[
            { value: 'en' as const, label: 'English' },
            { value: 'ru' as const, label: 'Русский' },
          ].map((opt, i) => (
            <div
              key={opt.value}
              onClick={() => setSelectedLang(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px', cursor: 'pointer',
                borderBottom: i === 0 ? `1px solid ${CARD_BORDER}` : 'none',
              }}
            >
              <span style={{ fontSize: 14, color: WHITE }}>{opt.label}</span>
              {selectedLang === opt.value && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </section>

    </main>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

