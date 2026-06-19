import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 像素头像外框：方角，避免圆形裁剪 140px 画布 */
export function PixelAvatarFrame({
  size = 36,
  className,
  children,
  onClick,
  type = 'div',
  title,
  'aria-label': ariaLabel,
}: {
  size?: number
  className?: string
  children: ReactNode
  onClick?: (e: React.MouseEvent) => void
  type?: 'div' | 'button'
  title?: string
  'aria-label'?: string
}) {
  const frameClass = cn(
    'flex shrink-0 items-center justify-center rounded-md bg-muted/35 ring-1 ring-border/55',
    type === 'button' && 'cursor-pointer border-none p-0 transition-transform hover:scale-[1.03]',
    className,
  )
  const style = { width: size, height: size }

  if (type === 'button') {
    return (
      <button
        type="button"
        className={frameClass}
        style={style}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    )
  }

  return (
    <div className={frameClass} style={style} title={title}>
      {children}
    </div>
  )
}
