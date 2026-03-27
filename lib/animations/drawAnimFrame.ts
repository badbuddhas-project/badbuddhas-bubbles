import { ANIM_COLORS } from './animConfig'

export function drawAnimFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  type: string,
  T: number,
): void {
  const colors = ANIM_COLORS[type] || ANIM_COLORS.slow
  const [mr, mg, mb] = colors.main
  const [br, bg, bb] = colors.bg
  const cx = W / 2
  const cy = H / 2
  const minDim = Math.min(W, H)

  // --- Background ---
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = `rgb(${br},${bg},${bb})`
  ctx.fillRect(0, 0, W, H)

  // Background glow
  const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * 0.5)
  bgGlow.addColorStop(0, `rgba(${mr},${mg},${mb},0.07)`)
  bgGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = bgGlow
  ctx.fillRect(0, 0, W, H)

  // --- Draw shape ---
  if (type === 'ground') {
    drawO3G(ctx, cx, cy, minDim, T, mr, mg, mb)
  } else if (type === 'rise') {
    drawF1R(ctx, cx, cy, minDim, T, mr, mg, mb)
  } else {
    drawF1S(ctx, cx, cy, minDim, T, mr, mg, mb)
  }

  // --- White core ---
  ctx.globalCompositeOperation = 'source-over'
  const coreR = type === 'ground'
    ? minDim * 0.3 * (1 + 0.08 * Math.sin(T * 0.42)) * 0.28
    : type === 'rise'
      ? minDim * 0.21 * (1 + 0.06 * Math.sin(T * 0.55)) * 0.3
      : minDim * 0.24 * (1 + 0.07 * Math.sin(T * 0.38)) * 0.35
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR)
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.9)')
  coreGrad.addColorStop(0.5, `rgba(${mr},${mg},${mb},0.4)`)
  coreGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = coreGrad
  ctx.beginPath()
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
  ctx.fill()

  // --- Edge vignette ---
  ctx.globalCompositeOperation = 'source-over'
  const vig = ctx.createRadialGradient(cx, cy, minDim * 0.32, cx, cy, minDim * 0.52)
  vig.addColorStop(0, 'transparent')
  vig.addColorStop(1, `rgba(${br},${bg},${bb},0.85)`)
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)
}

// ─── F1-S: Flower Bloom Slow (2 circles) ───

function drawF1S(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, minDim: number, T: number,
  mr: number, mg: number, mb: number,
): void {
  const breathe = 1 + 0.07 * Math.sin(T * 0.38)
  const R = minDim * 0.24 * breathe
  const rot = T * 0.07

  const centers = [
    { x: cx, y: cy },
    { x: cx + Math.cos(rot) * R * 0.6, y: cy + Math.sin(rot) * R * 0.6 },
  ]

  for (const c of centers) {
    drawGlowCircle(ctx, c.x, c.y, R, mr, mg, mb)
  }
}

// ─── O3-G: Organic Circle Ground (2 deforming contours) ───

function drawO3G(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, minDim: number, T: number,
  mr: number, mg: number, mb: number,
): void {
  const breathe = 1 + 0.08 * Math.sin(T * 0.42)
  const R = minDim * 0.3 * breathe
  const layers = [
    { r: R, amp: 0.07 },
    { r: R * 0.72, amp: 0.05 },
  ]

  for (const layer of layers) {
    const pts = 40
    const points: Array<{ x: number; y: number }> = []

    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2
      let wobble = 0
      for (let k = 0; k < 4; k++) {
        wobble += Math.sin(a * (k + 1) + T * (0.14 + k * 0.04)) * layer.amp
      }
      const r = layer.r * (1 + wobble)
      points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
    }

    drawGlowPath(ctx, points, mr, mg, mb)
  }
}

// ─── F1-R: Flower Bloom Rise (6 petals + outer ring) ───

function drawF1R(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, minDim: number, T: number,
  mr: number, mg: number, mb: number,
): void {
  const breathe = 1 + 0.06 * Math.sin(T * 0.55)
  const R = minDim * 0.21 * breathe
  const rot = T * 0.12

  // Outer ring: 6 circles
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 6; i++) {
    const a = rot * 0.7 + i * (Math.PI * 2 / 6)
    const ox = cx + Math.cos(a) * R * 2
    const oy = cy + Math.sin(a) * R * 2
    const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, R * 0.8)
    grad.addColorStop(0, `rgba(${mr},${mg},${mb},0.25)`)
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(ox, oy, R * 0.8, 0, Math.PI * 2)
    ctx.fill()
  }

  // Center + 6 petals
  const centers = [{ x: cx, y: cy }]
  for (let i = 0; i < 6; i++) {
    const a = rot + i * (Math.PI * 2 / 6)
    centers.push({
      x: cx + Math.cos(a) * R * 0.6,
      y: cy + Math.sin(a) * R * 0.6,
    })
  }

  for (const c of centers) {
    drawGlowCircle(ctx, c.x, c.y, R, mr, mg, mb)
  }
}

// ─── Helpers ───

function drawGlowCircle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, R: number,
  mr: number, mg: number, mb: number,
): void {
  const passes = [
    { alpha: 0.18, lw: 8 },
    { alpha: 0.35, lw: 2.5 },
    { alpha: 1, lw: 1 },
  ]

  for (const p of passes) {
    ctx.globalCompositeOperation = p.alpha < 1 ? 'lighter' : 'lighter'
    const grad = ctx.createRadialGradient(x, y, 0, x, y, R)
    grad.addColorStop(0, `rgba(${mr},${mg},${mb},${p.alpha * 0.5})`)
    grad.addColorStop(0.7, `rgba(${mr},${mg},${mb},${p.alpha * 0.3})`)
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, R, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = `rgba(${mr},${mg},${mb},${p.alpha})`
    ctx.lineWidth = p.lw
    ctx.beginPath()
    ctx.arc(x, y, R, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawGlowPath(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  mr: number, mg: number, mb: number,
): void {
  const passes = [
    { alpha: 0.18, lw: 8 },
    { alpha: 0.35, lw: 2.5 },
    { alpha: 1, lw: 1 },
  ]

  for (const p of passes) {
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = `rgba(${mr},${mg},${mb},${p.alpha})`
    ctx.lineWidth = p.lw
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.closePath()
    ctx.stroke()

    // Fill with radial gradient for inner glow
    if (p.alpha >= 0.35) {
      const bx = points.reduce((s, pt) => s + pt.x, 0) / points.length
      const by = points.reduce((s, pt) => s + pt.y, 0) / points.length
      const maxR = Math.max(...points.map(pt => Math.hypot(pt.x - bx, pt.y - by)))
      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, maxR)
      grad.addColorStop(0, `rgba(${mr},${mg},${mb},${p.alpha * 0.3})`)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.fill()
    }
  }
}
