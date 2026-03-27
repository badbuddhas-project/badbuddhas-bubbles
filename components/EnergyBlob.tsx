'use client'

import { useEffect, useRef } from 'react'
import { getAnimCanvas } from '@/lib/animations/getAnimCanvas'

interface Props {
  type?: string
  size?: number
  radius?: number
  play?: boolean
  lock?: boolean
  className?: string
}

export function EnergyBlob({ type = 'slow', size = 80, radius = 14, play = false, lock = false, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return

    const src = getAnimCanvas(type, size)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas.style.cssText = `position:absolute;inset:0;width:${size}px;height:${size}px;border-radius:${radius}px`
    el.style.position = 'relative'
    el.appendChild(canvas)

    const ctx = canvas.getContext('2d')!
    let raf: number

    function copy() {
      ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, size, size)
      raf = requestAnimationFrame(copy)
    }
    raf = requestAnimationFrame(copy)

    return () => {
      cancelAnimationFrame(raf)
      if (el.contains(canvas)) el.removeChild(canvas)
    }
  }, [type, size, radius])

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, borderRadius: radius, overflow: 'hidden' }}
    >
      {play && !lock && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ width: size * 0.38, height: size * 0.38, borderRadius: '50%', background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size * 0.16} height={size * 0.16} viewBox="0 0 12 14"><path d="M1 1.5l10 5-10 5V1.5z" fill="white" /></svg>
          </div>
        </div>
      )}
      {lock && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: radius }}>
          <svg width="20" height="22" viewBox="0 0 24 24" fill="none" stroke="#C034A5" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
        </div>
      )}
    </div>
  )
}
