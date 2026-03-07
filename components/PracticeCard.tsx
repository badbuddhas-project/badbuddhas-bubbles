'use client'

import type { Practice } from '@/types/database'
import { formatDuration } from '@/lib/utils'

interface PracticeCardProps {
  practice: Practice
  isFavorite: boolean
  onToggleFavorite: (practiceId: string) => void
  onClick: (practice: Practice) => void
}

export function PracticeCard({
  practice,
  isFavorite,
  onToggleFavorite,
  onClick,
}: PracticeCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite(practice.id)
  }

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(practice)
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/50 active:bg-zinc-800/50 transition-colors cursor-pointer"
      onClick={() => onClick(practice)}
    >
      {/* Preview with Play button */}
      <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-zinc-800">
        {practice.preview_image_url ? (
          <img
            src={practice.preview_image_url + '?v=1'}
            alt={practice.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800" />
        )}

        {/* Play button overlay */}
        <button
          onClick={handlePlayClick}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <PlayIcon className="w-5 h-5 text-black ml-0.5" />
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <h3 className="text-white font-medium truncate">
            {practice.title_ru || practice.title}
          </h3>
          {practice.is_premium && (
            <StarIcon className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
          )}
        </div>

        <p className="text-sm text-zinc-500 mt-0.5">
          {formatDuration(practice.duration_seconds)}
        </p>

        {/* Instructor */}
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
            {practice.instructor_avatar_url ? (
              <img
                src={practice.instructor_avatar_url + '?v=1'}
                alt={practice.instructor_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                {practice.instructor_name.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-xs text-zinc-500 truncate">
            {practice.instructor_name}
          </span>
        </div>
      </div>

      {/* Favorite button */}
      <button
        onClick={handleFavoriteClick}
        className="flex-shrink-0 p-2 -mr-1"
      >
        <HeartIcon
          className={`w-6 h-6 transition-colors ${
            isFavorite ? 'text-emerald-300 fill-emerald-300' : 'text-zinc-600'
          }`}
          filled={isFavorite}
        />
      </button>
    </div>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
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
