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
      <style>{`
        @keyframes splash-breathe {
          0%, 100% { transform: scale(1) translateY(0px); opacity: 1; }
          50%       { transform: scale(1.07) translateY(-4px); opacity: 0.82; }
        }
        @keyframes splash-dot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 0.7; transform: scale(1.2); }
        }
      `}</style>

      {/* Logo + text animate as ONE unit */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'splash-breathe 4s cubic-bezier(0.45,0,0.55,1) infinite',
          transformOrigin: 'center center',
          marginBottom: 48,
        }}
      >
        <BrandMark size={64} />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#CBCBCB',
            letterSpacing: '0.04em',
            marginTop: 16,
          }}
        >
          badbuddhas
        </span>
        <span
          style={{
            fontSize: 12,
            color: '#CBCBCB',
            opacity: 0.45,
            letterSpacing: '0.02em',
            marginTop: 5,
          }}
        >
          [bubbles]
        </span>
      </div>

      {/* 3 loading dots */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#CBCBCB',
              opacity: 0.4,
              animation: 'splash-dot 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.22}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
