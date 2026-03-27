import { drawAnimFrame } from './drawAnimFrame'

const _cache: Map<string, HTMLCanvasElement> = new Map()

export function getAnimCanvas(type: string, size: number): HTMLCanvasElement {
  const key = `${type}_${size}`
  if (_cache.has(key)) return _cache.get(key)!

  const DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2
  const S = size * DPR
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!

  function loop(ts: number) {
    drawAnimFrame(ctx, S, S, type, ts * 0.001)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  _cache.set(key, canvas)
  return canvas
}
