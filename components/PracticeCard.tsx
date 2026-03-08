'use client'

import type { Practice } from '@/types/database'

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
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 10,
            overflow: 'hidden',
            backgroundImage: practice.preview_image_url
              ? `url(${practice.preview_image_url}?v=1)`
              : undefined,
            backgroundSize: '180%',
            backgroundPosition: 'center',
            background: practice.preview_image_url
              ? undefined
              : 'linear-gradient(135deg, #27272a, #18181b)',
          }}
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
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="#000"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
          )}
          <span style={{ fontSize: 15, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {practice.title_ru || practice.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#313333', border: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {practice.instructor_avatar_url ? (
              <img
                src={practice.instructor_avatar_url + '?v=1'}
                alt={practice.instructor_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#CBCBCB" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            )}
          </div>
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
