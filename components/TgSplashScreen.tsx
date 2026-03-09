'use client'

import { BrandMark } from '@/components/BrandMark'

export function TgSplashScreen() {
  return (
    <div
      style={{
        height: '100%',
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <BrandMark size={64} />
      </div>

      {/* Spinning loader */}
      <div
        style={{
          width: 28,
          height: 28,
          border: '2px solid #1A1A1A',
          borderTopColor: '#FFFFFF',
          borderRadius: '50%',
          marginBottom: 16,
          animation: 'tg-splash-spin 1s linear infinite',
        }}
      />

      {/* Loading text */}
      <span
        style={{
          fontSize: 13,
          color: '#CBCBCB',
          opacity: 0.5,
        }}
      >
        [вдох-выдох]
      </span>

      <style>{`
        @keyframes tg-splash-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
