'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { usePractices } from '@/hooks/usePractices'
import { useTranslation } from '@/lib/i18n'
import BreathVisual from '@/components/BreathVisual'
import { BrandMark } from '@/components/BrandMark'
import { TabBar } from '@/components/TabBar'
import type { Practice } from '@/types/database'

const C = {
  bg: '#000',
  card: '#0A0A0A',
  border: '#1A1A1A',
  border2: '#222',
  white: '#fff',
  text: '#CBCBCB',
  text2: 'rgba(203,203,203,0.5)',
  sub: 'rgba(203,203,203,0.45)',
  slow: '#8b5cf6',
  ground: '#3b82f6',
  rise: '#ec4899',
  pink: '#C034A5',
}

const CAT_DISPLAY: Record<string, string> = {
  relax: 'SLOW', balance: 'GROUND', energize: 'RISE',
}

export default function CatalogPage() {
  const router = useRouter()
  const { user } = useUser()
  const { practices, isLoading } = usePractices()
  const { language } = useTranslation()
  const isPremium = user?.is_premium ?? false

  const [cat, setCat] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [filterOpen, setFilterOpen] = useState(false)
  const [instrFilter, setInstrFilter] = useState('all')
  const [durFilter, setDurFilter] = useState('all')
  const [langFilter, setLangFilter] = useState('all')

  const instructors = useMemo(() => {
    const names = Array.from(new Set(practices.map(p => p.instructor_name)))
    return ['all', ...names]
  }, [practices])

  const durations = ['all', 'до 10 мин', '10–20 мин', '20+ мин']
  const langs = ['all', 'Русский', 'English']

  const cats = [
    { id: 'all', label: language === 'ru' ? 'Все' : 'All', color: C.text },
    { id: 'relax', label: 'Slow', color: C.slow },
    { id: 'balance', label: 'Ground', color: C.ground },
    { id: 'energize', label: 'Rise', color: C.rise },
  ]

  const filtered = useMemo(() => {
    return practices.filter(p => {
      if (cat !== 'all' && p.category !== cat) return false
      if (instrFilter !== 'all' && p.instructor_name !== instrFilter) return false
      if (langFilter !== 'all') {
        const lang = langFilter === 'Русский' ? 'ru' : 'en'
        if (p.language !== lang) return false
      }
      if (durFilter !== 'all') {
        const mins = Math.floor(p.duration_seconds / 60)
        if (durFilter === 'до 10 мин' && mins >= 10) return false
        if (durFilter === '10–20 мин' && (mins < 10 || mins > 20)) return false
        if (durFilter === '20+ мин' && mins <= 20) return false
      }
      return true
    })
  }, [practices, cat, instrFilter, durFilter, langFilter])

  const activeFiltersCount = [instrFilter, durFilter, langFilter].filter(f => f !== 'all').length

  const handlePractice = (p: Practice) => {
    if (!isPremium && p.is_premium) router.push('/subscribe')
    else router.push(`/practice/${p.id}`)
  }

  return (
    <main style={{ minHeight: '100vh', background: C.bg, overflowY: 'auto', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '44px 16px 10px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BrandMark size={16} />
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', background: C.card, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
          {(['list', 'grid'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{ background: viewMode === mode ? C.border2 : 'none', border: 'none', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              {mode === 'list' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === mode ? C.text : C.sub} strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === mode ? C.text : C.sub} strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px 8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {cats.map(c => {
          const active = cat === c.id
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
                background: active ? c.color : C.card,
                color: active ? (c.id === 'all' ? C.bg : '#fff') : C.sub,
                transition: 'all 0.2s',
              }}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Filters row */}
      <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '8px 16px' }}>
        <button
          onClick={() => setFilterOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: filterOpen ? 10 : 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeFiltersCount > 0 ? C.text : C.sub} strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: activeFiltersCount > 0 ? C.text : C.sub }}>
            {language === 'ru' ? 'Фильтры' : 'Filters'}{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {filterOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Instructor */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                {language === 'ru' ? 'Ведущий' : 'Instructor'}
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {instructors.map(ins => (
                  <FilterChip
                    key={ins}
                    label={ins === 'all' ? (language === 'ru' ? 'Все' : 'All') : ins.split(' ')[0]}
                    active={instrFilter === ins}
                    onClick={() => setInstrFilter(ins)}
                  />
                ))}
              </div>
            </div>
            {/* Duration */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                {language === 'ru' ? 'Длительность' : 'Duration'}
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {durations.map(d => (
                  <FilterChip
                    key={d}
                    label={d === 'all' ? (language === 'ru' ? 'Любая' : 'Any') : d}
                    active={durFilter === d}
                    onClick={() => setDurFilter(d)}
                  />
                ))}
              </div>
            </div>
            {/* Language */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                {language === 'ru' ? 'Язык' : 'Language'}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {langs.map(l => (
                  <FilterChip
                    key={l}
                    label={l === 'all' ? (language === 'ru' ? 'Все' : 'All') : l}
                    active={langFilter === l}
                    onClick={() => setLangFilter(l)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <div style={{ padding: '8px 16px 2px' }}>
        <span style={{ fontSize: 11, color: C.sub }}>
          {isLoading ? '...' : `${filtered.length} ${language === 'ru' ? 'практик' : 'practices'}`}
        </span>
      </div>

      {/* Practice list or grid */}
      {isLoading ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" style={{ margin: '0 auto' }} />
        </div>
      ) : viewMode === 'list' ? (
        <div style={{ padding: '4px 16px' }}>
          {filtered.map(p => (
            <PracticeRow key={p.id} p={p} onTap={() => handlePractice(p)} isPremium={isPremium} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '8px 16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {filtered.map(p => (
            <GridCard key={p.id} p={p} onTap={() => handlePractice(p)} isPremium={isPremium} />
          ))}
        </div>
      )}

      <TabBar isPremium={isPremium} />
    </main>
  )
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 16, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
        border: `1px solid ${active ? 'rgba(203,203,203,0.5)' : '#1A1A1A'}`,
        background: active ? 'rgba(203,203,203,0.5)' : 'transparent',
        color: active ? '#000' : 'rgba(203,203,203,0.45)',
      }}
    >
      {label}
    </button>
  )
}

// ─── Practice Row (list mode) ─────────────────────────────────────────────────

function PracticeRow({ p, onTap, isPremium }: { p: Practice; onTap: () => void; isPremium: boolean }) {
  const catColor = { relax: '#8b5cf6', balance: '#3b82f6', energize: '#ec4899' }[p.category] || '#CBCBCB'
  const mins = Math.floor(p.duration_seconds / 60)
  const locked = !isPremium && p.is_premium

  return (
    <div
      onClick={onTap}
      style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: `1px solid #1A1A1A`, alignItems: 'center', cursor: 'pointer' }}
    >
      <div style={{ flexShrink: 0, width: 60, height: 60, borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
        <BreathVisual category={p.category} size={60} borderRadius={0} animate={false} showBubbles={false} />
        {locked && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C034A5" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: catColor, textTransform: 'uppercase', letterSpacing: 1 }}>
            {CAT_DISPLAY[p.category] ?? p.category}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(203,203,203,0.35)' }}>{mins} мин</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#CBCBCB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
          {p.title_ru || p.title}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(203,203,203,0.45)' }}>{p.instructor_name}</div>
      </div>
    </div>
  )
}

// ─── Grid Card (grid mode) ────────────────────────────────────────────────────

function GridCard({ p, onTap, isPremium }: { p: Practice; onTap: () => void; isPremium: boolean }) {
  const catColor = { relax: '#8b5cf6', balance: '#3b82f6', energize: '#ec4899' }[p.category] || '#CBCBCB'
  const mins = Math.floor(p.duration_seconds / 60)
  const locked = !isPremium && p.is_premium

  return (
    <div
      onClick={onTap}
      style={{ background: '#0A0A0A', borderRadius: 16, overflow: 'hidden', border: '1px solid #1A1A1A', cursor: 'pointer' }}
    >
      <div style={{ position: 'relative' }}>
        <BreathVisual category={p.category} size={170} borderRadius={0} animate={false} showBubbles={false} />
        {locked && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C034A5" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(10,10,10,0.85) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: catColor, textTransform: 'uppercase', letterSpacing: 1 }}>
            {CAT_DISPLAY[p.category] ?? p.category}
          </span>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.title_ru || p.title}
          </div>
        </div>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(203,203,203,0.45)' }}>{mins} мин</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(203,203,203,0.3)" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </div>
    </div>
  )
}
