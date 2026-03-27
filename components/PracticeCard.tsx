'use client'

import type { Practice } from '@/types/database'
import { EnergyBlob } from '@/components/EnergyBlob'

interface PracticeCardProps {
  practice: Practice
  isFavorite: boolean
  onToggleFavorite: (practiceId: string) => void
  onClick: (practice: Practice) => void
  catColors?: Record<string, string>
}

export function PracticeCard({
  practice,
  isFavorite,
  onToggleFavorite,
  onClick,
  catColors = {},
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
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', cursor: 'pointer' }}
      onClick={() => onClick(practice)}
    >
      {/* Preview with Play button */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <EnergyBlob
          type={practice.category}
          size={80}
          radius={10}
        />
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="8,5 20,12 8,19"/></svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: catColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {practice.category}
          </span>
          <span style={{ fontSize: 10, color: '#CBCBCB', opacity: 0.5 }}>
            {mins} {'\u043C\u0438\u043D'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          {practice.is_premium && (
            <img src="/images/icon-black.png" width={16} height={16} alt="" style={{ display: 'block', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 15, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {practice.title_ru || practice.title}
          </span>
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
}
