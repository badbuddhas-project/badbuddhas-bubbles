'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { getSupabaseClient } from '@/lib/supabase'
import { BottomSheet } from '@/components/BottomSheet'
import { useTranslation } from '@/lib/i18n'

export default function SettingsPage() {
  const router = useRouter()
  const { user, refreshUser } = useUser()
  const { t } = useTranslation()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
      const supabase = getSupabaseClient()
      await supabase
        .from('users')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        })
        .eq('id', user.id)

      await refreshUser()
      router.back()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPassword = () => {
    // In Telegram Mini App context, password reset would typically
    // be handled differently or not available
    alert(t('settings.resetPasswordUnavailable'))
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    try {
      const supabase = getSupabaseClient()

      // Delete user data (cascades to related tables)
      await supabase.from('users').delete().eq('id', user.id)

      // Navigate to home
      router.push('/')
    } catch (err) {
      console.error('Failed to delete account:', err)
    }
  }

  const hasChanges =
    firstName !== (user?.first_name || '') ||
    lastName !== (user?.last_name || '')

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center"
        >
          <ArrowLeftIcon className="w-5 h-5 text-white" />
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
          {isSaving ? t('settings.saving') : t('common.save')}
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

        {/* Email (display only) */}
        <div>
          <label className="block text-sm text-zinc-500 mb-2">
            {t('settings.email')}
          </label>
          <div className="w-full px-4 py-3 bg-zinc-900 rounded-xl text-zinc-500">
            {user?.username ? `@${user.username}` : t('common.notAvailable')}
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="p-4 space-y-3">
        {/* Reset Password */}
        <button
          onClick={handleResetPassword}
          className="w-full flex items-center gap-3 px-4 py-4 bg-zinc-900 rounded-xl"
        >
          <KeyIcon className="w-5 h-5 text-zinc-400" />
          <span className="text-emerald-300">{t('settings.resetPassword')}</span>
        </button>

        {/* Delete Account */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-4 bg-zinc-900 rounded-xl"
        >
          <TrashIcon className="w-5 h-5 text-red-500" />
          <span className="text-zinc-400">{t('settings.deleteAccount')}</span>
        </button>
      </section>

      {/* Delete Confirmation Bottom Sheet */}
      <BottomSheet
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('settings.deleteAccountTitle')}
      >
        <div className="p-4">
          <p className="text-zinc-400 text-center mb-6">
            {t('settings.deleteAccountMessage')}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleDeleteAccount}
              className="w-full py-3 bg-red-500 text-white font-medium rounded-xl"
            >
              {t('settings.deleteAccountTitle')}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="w-full py-3 bg-zinc-800 text-white font-medium rounded-xl"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </BottomSheet>
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

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
