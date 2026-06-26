import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PIXEL_CELL_MONO, PIXEL_CELL_SUBTITLE, PIXEL_CELL_TITLE } from './pixelTokens'

/** 主标题 + 可选副标题（如套餐名 + code） */
export function PixelCellStack({
  title,
  subtitle,
  align = 'left',
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <div className={cn(alignClass, className)}>
      <div className={PIXEL_CELL_TITLE}>{title}</div>
      {subtitle != null && subtitle !== '' ? (
        <div className={PIXEL_CELL_SUBTITLE}>{subtitle}</div>
      ) : null}
    </div>
  )
}

export function PixelCellMono({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={cn(PIXEL_CELL_MONO, className)}>{children}</span>
}

export function PixelCellText({
  children,
  muted,
  className,
}: {
  children: ReactNode
  muted?: boolean
  className?: string
}) {
  return (
    <span className={cn(muted ? PIXEL_CELL_SUBTITLE : PIXEL_CELL_TITLE, className)}>{children}</span>
  )
}
