'use client'

import { memo } from 'react'
import type { Practice } from '@/types/database'
import BreathVisual from './BreathVisual'

const CAT_DISPLAY: Record<string, string> = {
  relax: 'SLOW',
  balance: 'GROUND',
  energize: 'RISE',
  slow: 'SLOW',
  ground: 'GROUND',
  rise: 'RISE',
}

interface PracticeCardProps {
  practice: Practice
  isFavorite: boolean
  onToggleFavorite: (practiceId: string) => void
  onClick: (practice: Practice) => void
  catColors?: Record<string, string>
  isLocked?: boolean
}

export const PracticeCard = memo(function PracticeCard({
  practice,
  isFavorite,
  onToggleFavorite,
  onClick,
  catColors = {},
  isLocked = false,
}: PracticeCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite(practice.id)
  }

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(practice)
  }

  const mins = Math.floor(practice.duration_seconds / 60)
  const catColor = catColors[practice.category] || '#CBCBCB'

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', cursor: 'pointer', opacity: isLocked ? 0.55 : 1 }}
      onClick={() => onClick(practice)}
    >
      {/* Preview with Play/Lock button */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <BreathVisual category={practice.category} size={80} borderRadius={10} animate={false} />
        <button
          onClick={handlePlayClick}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {isLocked ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C034A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="8,5 20,12 8,19"/></svg>
          )}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: catColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {CAT_DISPLAY[practice.category] ?? practice.category}
          </span>
          <span style={{ fontSize: 10, color: '#CBCBCB', opacity: 0.5 }}>
            {mins} {'\u043C\u0438\u043D'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          {practice.is_premium && !isLocked && (
            <img src="/images/icon-black.png" width={16} height={16} alt="" style={{ display: 'block', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 15, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {practice.title_ru || practice.title}
          </span>
          {isLocked && (
            <span style={{ fontSize: 8, fontWeight: 700, color: '#C034A5', background: 'rgba(192,52,165,0.12)', borderRadius: 4, padding: '2px 5px', flexShrink: 0, letterSpacing: '0.03em' }}>BLACK</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {practice.instructor_avatar_url ? (
            <img src={practice.instructor_avatar_url + '?v=1'} alt="" width={20} height={20} style={{ borderRadius: '50%', display: 'block', flexShrink: 0, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#313333', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: '#fff', lineHeight: 1 }}>{practice.instructor_name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <span style={{ fontSize: 12, color: '#CBCBCB', opacity: 0.7 }}>
            {practice.instructor_name}
          </span>
        </div>
      </div>

      {/* Favorite button */}
      <button
        onClick={handleFavoriteClick}
        style={{ width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? '#CBCBCB' : 'none'} stroke="#CBCBCB" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
    </div>
  )
})
