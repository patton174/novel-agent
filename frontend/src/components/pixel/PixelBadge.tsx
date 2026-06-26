import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { pixelBadgeClass, type PixelBadgeTone } from './pixelTokens'

export type { PixelBadgeTone }

export function PixelBadge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: PixelBadgeTone
  className?: string
}) {
  return <span className={cn(pixelBadgeClass(tone), className)}>{children}</span>
}
