'use client'

import { BreathingLogo } from './BreathingLogo'

export function TgSplashScreen() {
  return (
    <div
      style={{
        height: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow behind logo */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(59,130,246,0.08) 40%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo + text */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: 20 }}><BreathingLogo size={120} /></div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '0.04em' }}>badbuddhas</div>
        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 5 }}>[bubbles]</div>
      </div>

      {/* Dot indicators */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 8, marginTop: 40 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af', opacity: 0.3, animation: 'splash-dot 1.2s ease-in-out infinite' }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af', opacity: 0.55, animation: 'splash-dot 1.2s ease-in-out 0.2s infinite' }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af', opacity: 0.8, animation: 'splash-dot 1.2s ease-in-out 0.4s infinite' }} />
      </div>

      <style>{`
        @keyframes splash-dot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
