import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useThemeStore } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  hue: 'fg' | 'primary' | 'neon'
  alpha: number
  phase: number
}

function readColors(root: HTMLElement) {
  const style = getComputedStyle(root)
  return {
    fg: style.getPropertyValue('--foreground').trim() || '#1a1a1a',
    primary: style.getPropertyValue('--primary').trim() || '#1043ff',
    neon: style.getPropertyValue('--neon').trim() || '#c8ff00',
  }
}

function withAlpha(hex: string, alpha: number) {
  const raw = hex.replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const n = Number.parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Hero 动态像素粒子背景 */
export function MarketingPixelParticles({
  className,
  intensity = 'default',
}: {
  className?: string
  /** hero：移动端首屏更密粒子 */
  intensity?: 'default' | 'hero'
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const root = canvas.closest('[data-theme]') ?? document.documentElement
    let colors = readColors(root as HTMLElement)
    let particles: Particle[] = []
    let w = 0
    let h = 0
    let raf = 0
    let t0 = performance.now()

    const spawn = () => {
      const divisor = intensity === 'hero' ? 5200 : 9000
      const cap = intensity === 'hero' ? 200 : 140
      const floor = intensity === 'hero' ? 72 : 48
      const count = Math.min(cap, Math.max(floor, Math.floor((w * h) / divisor)))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() > 0.72 ? 3 : 2,
        hue: (['fg', 'primary', 'neon'] as const)[Math.floor(Math.random() * 3)],
        alpha: 0.12 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, Math.floor(rect.width))
      h = Math.max(1, Math.floor(rect.height))
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      colors = readColors(root as HTMLElement)
      spawn()
    }

    const draw = (now: number) => {
      const dt = Math.min(32, now - t0)
      t0 = now
      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        if (!reduced) {
          p.x += p.vx * (dt / 16)
          p.y += p.vy * (dt / 16)
          if (p.x < -8) p.x = w + 8
          if (p.x > w + 8) p.x = -8
          if (p.y < -8) p.y = h + 8
          if (p.y > h + 8) p.y = -8
        }

        const pulse = 0.55 + 0.45 * Math.sin(now / 900 + p.phase)
        const alpha = p.alpha * pulse
        const token = p.hue === 'primary' ? colors.primary : p.hue === 'neon' ? colors.neon : colors.fg
        ctx.fillStyle = withAlpha(token, alpha)
        const sx = Math.floor(p.x / 2) * 2
        const sy = Math.floor(p.y / 2) * 2
        ctx.fillRect(sx, sy, p.size, p.size)
      }

      raf = requestAnimationFrame(draw)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [reduced, theme, intensity])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  )
}
