import { cn } from '@/lib/utils'

/** 块状像素右箭头（Neo-Brutalism 风格） */
export function PixelArrowRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn('hero-pixel-arrow', className)}
      aria-hidden
    >
      <rect x="2" y="8" width="10" height="4" />
      <rect x="10" y="4" width="4" height="4" />
      <rect x="10" y="12" width="4" height="4" />
      <rect x="14" y="6" width="4" height="8" />
    </svg>
  )
}
