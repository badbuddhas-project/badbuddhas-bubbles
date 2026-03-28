'use client'

import { useRef, useEffect } from 'react'

interface BreathVisualProps {
  category: string
  size: number
  borderRadius?: number
  animate?: boolean
  showBubbles?: boolean
}

type ColorRGB = { r: number; g: number; b: number }

type VisualType = 'slow' | 'ground' | 'rise'

const CATEGORY_MAP: Record<string, VisualType> = {
  relax: 'slow',
  balance: 'ground',
  energize: 'rise',
  slow: 'slow',
  ground: 'ground',
  rise: 'rise',
}

const COLORS: Record<VisualType, ColorRGB> = {
  slow: { r: 139, g: 92, b: 246 },
  ground: { r: 59, g: 130, b: 246 },
  rise: { r: 236, g: 72, b: 153 },
}

function seededRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function rgb(c: ColorRGB, alpha: number): string {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`
}

function drawBubbles(
  ctx: CanvasRenderingContext2D,
  S: number,
  c: ColorRGB,
  t: number,
  rng: () => number
) {
  for (let i = 0; i < 3; i++) {
    const bx = S * 0.5 + (rng() - 0.5) * S * 0.6
    const by = S * 0.5 + (rng() - 0.5) * S * 0.6
    const br = S * (0.018 + rng() * 0.022)
    const phase = rng() * Math.PI * 2
    const driftX = Math.sin(t * 0.3 + phase) * S * 0.04
    const driftY = Math.cos(t * 0.2 + phase * 1.3) * S * 0.04
    ctx.beginPath()
    ctx.arc(bx + driftX, by + driftY, br, 0, Math.PI * 2)
    ctx.fillStyle = rgb(c, 0.18)
    ctx.fill()
    ctx.strokeStyle = rgb(c, 0.35)
    ctx.lineWidth = S * 0.004
    ctx.stroke()
  }
}

function drawSlow(ctx: CanvasRenderingContext2D, S: number, c: ColorRGB, t: number, showBubbles: boolean) {
  const cx = S / 2
  const cy = S / 2
  const cr = S * 0.22
  const breathe = 1 + 0.06 * Math.sin(t * 0.4)
  const rot = t * 0.08
  const scaledR = cr * breathe

  // Glow layer
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rot)

  // Central circle glow
  ctx.beginPath()
  ctx.arc(0, 0, scaledR, 0, Math.PI * 2)
  ctx.strokeStyle = rgb(c, 0.12)
  ctx.lineWidth = S * 0.02
  ctx.stroke()

  // Petal glow
  const px = scaledR
  ctx.beginPath()
  ctx.arc(px, 0, scaledR, 0, Math.PI * 2)
  ctx.strokeStyle = rgb(c, 0.12)
  ctx.lineWidth = S * 0.02
  ctx.stroke()

  ctx.restore()

  // Sharp layer
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rot)

  ctx.beginPath()
  ctx.arc(0, 0, scaledR, 0, Math.PI * 2)
  ctx.strokeStyle = rgb(c, 0.7)
  ctx.lineWidth = S * 0.008
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(px, 0, scaledR, 0, Math.PI * 2)
  ctx.strokeStyle = rgb(c, 0.7)
  ctx.lineWidth = S * 0.008
  ctx.stroke()

  ctx.restore()

  // Center dot
  ctx.beginPath()
  ctx.arc(cx, cy, S * 0.025, 0, Math.PI * 2)
  ctx.fillStyle = rgb(c, 0.9)
  ctx.fill()

  if (showBubbles) {
    const rng = seededRng(42)
    drawBubbles(ctx, S, c, t, rng)
  }
}

function drawRise(ctx: CanvasRenderingContext2D, S: number, c: ColorRGB, t: number) {
  const cx = S / 2
  const cy = S / 2
  const cr = S * 0.22
  const breathe = 1 + 0.06 * Math.sin(t * 0.4)
  const rot = t * 0.08
  const scaledR = cr * breathe
  const r2 = scaledR * 1.72

  const petalCount = 6

  // Glow layer
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rot)

  ctx.beginPath()
  ctx.arc(0, 0, scaledR, 0, Math.PI * 2)
  ctx.strokeStyle = rgb(c, 0.12)
  ctx.lineWidth = S * 0.02
  ctx.stroke()

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2
    const px = Math.cos(angle) * scaledR
    const py = Math.sin(angle) * scaledR
    ctx.beginPath()
    ctx.arc(px, py, scaledR, 0, Math.PI * 2)
    ctx.strokeStyle = rgb(c, 0.12)
    ctx.lineWidth = S * 0.02
    ctx.stroke()
  }

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 + Math.PI / 6
    const px = Math.cos(angle) * r2
    const py = Math.sin(angle) * r2
    ctx.beginPath()
    ctx.arc(px, py, scaledR, 0, Math.PI * 2)
    ctx.strokeStyle = rgb(c, 0.12)
    ctx.lineWidth = S * 0.02
    ctx.stroke()
  }

  ctx.restore()

  // Sharp layer
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rot)

  ctx.beginPath()
  ctx.arc(0, 0, scaledR, 0, Math.PI * 2)
  ctx.strokeStyle = rgb(c, 0.7)
  ctx.lineWidth = S * 0.008
  ctx.stroke()

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2
    const px = Math.cos(angle) * scaledR
    const py = Math.sin(angle) * scaledR
    ctx.beginPath()
    ctx.arc(px, py, scaledR, 0, Math.PI * 2)
    ctx.strokeStyle = rgb(c, 0.7)
    ctx.lineWidth = S * 0.008
    ctx.stroke()
  }

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 + Math.PI / 6
    const px = Math.cos(angle) * r2
    const py = Math.sin(angle) * r2
    ctx.beginPath()
    ctx.arc(px, py, scaledR, 0, Math.PI * 2)
    ctx.strokeStyle = rgb(c, 0.7)
    ctx.lineWidth = S * 0.008
    ctx.stroke()
  }

  ctx.restore()

  // Center dot
  ctx.beginPath()
  ctx.arc(cx, cy, S * 0.025, 0, Math.PI * 2)
  ctx.fillStyle = rgb(c, 0.9)
  ctx.fill()
}

function drawGround(ctx: CanvasRenderingContext2D, S: number, c: ColorRGB, t: number, showBubbles: boolean) {
  const cx = S / 2
  const cy = S / 2
  const R = S * 0.32
  const wobbleHarmonics = 6
  const wobbleAmp = 0.07

  function wobblePath(radius: number, timeOffset: number) {
    const steps = 120
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2
      let r = radius
      for (let h = 1; h <= wobbleHarmonics; h++) {
        r += radius * wobbleAmp * Math.sin(h * angle + t * (0.3 + h * 0.1) + timeOffset) / wobbleHarmonics
      }
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  }

  // Layer 1 glow
  wobblePath(R, 0)
  ctx.strokeStyle = rgb(c, 0.12)
  ctx.lineWidth = S * 0.02
  ctx.stroke()

  // Layer 2 glow
  wobblePath(R * 0.75, Math.PI)
  ctx.strokeStyle = rgb(c, 0.12)
  ctx.lineWidth = S * 0.02
  ctx.stroke()

  // Layer 1 sharp
  wobblePath(R, 0)
  ctx.strokeStyle = rgb(c, 0.7)
  ctx.lineWidth = S * 0.008
  ctx.stroke()

  // Layer 2 sharp
  wobblePath(R * 0.75, Math.PI)
  ctx.strokeStyle = rgb(c, 0.7)
  ctx.lineWidth = S * 0.008
  ctx.stroke()

  // Center glow
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.15)
  grad.addColorStop(0, rgb(c, 0.5))
  grad.addColorStop(1, rgb(c, 0))
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.15, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  if (showBubbles) {
    const rng = seededRng(99)
    drawBubbles(ctx, S, c, t, rng)
  }
}

export default function BreathVisual({
  category,
  size,
  borderRadius = 14,
  animate = true,
  showBubbles = true,
}: BreathVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  const visualType: VisualType = CATEGORY_MAP[category] ?? 'slow'
  const color = COLORS[visualType]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(dpr, dpr)

    function render(t: number) {
      if (!ctx) return
      const S = size

      // Clear
      ctx.clearRect(0, 0, S, S)

      // Background
      ctx.fillStyle = '#060608'
      ctx.fillRect(0, 0, S, S)

      // Radial gradient overlay
      const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.6)
      grad.addColorStop(0, rgb(color, 0.06))
      grad.addColorStop(1, rgb(color, 0))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, S, S)

      // Draw visual
      const ts = t / 1000
      if (visualType === 'slow') drawSlow(ctx, S, color, ts, showBubbles)
      else if (visualType === 'rise') drawRise(ctx, S, color, ts)
      else drawGround(ctx, S, color, ts, showBubbles)
    }

    if (animate) {
      const loop = (timestamp: number) => {
        render(timestamp)
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
      return () => cancelAnimationFrame(rafRef.current)
    } else {
      render(0)
    }
  }, [category, size, animate, showBubbles, visualType, color])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        borderRadius,
        display: 'block',
      }}
    />
  )
}
