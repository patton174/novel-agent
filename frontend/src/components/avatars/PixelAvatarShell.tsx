import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PIXEL_AVATAR_BASE_PX } from '@/lib/pixelAvatar/ghostShared'
import type { PixelAvatarColors } from '@/lib/pixelAvatar/types'

export function pixelAvatarColorVars(colors: PixelAvatarColors): CSSProperties {
  return {
    '--pa-primary': colors.primary,
    '--pa-accent': colors.accent,
    '--pa-highlight': colors.highlight,
  } as CSSProperties
}

export interface PixelAvatarShellProps {
  styleId: string
  colors: PixelAvatarColors
  size?: number
  animated?: boolean
  className?: string
  children: ReactNode
}

/** 外层容器：定宽 + 主题色变量 + 140px 舞台缩放 */
export function PixelAvatarShell({
  styleId,
  colors,
  size = 36,
  animated = true,
  className,
  children,
}: PixelAvatarShellProps) {
  const scale = size / PIXEL_AVATAR_BASE_PX

  return (
    <div
      className={cn(
        'pixel-avatar',
        `pixel-avatar--${styleId}`,
        !animated && 'pixel-avatar--static',
        className,
      )}
      style={{
        ...pixelAvatarColorVars(colors),
        width: size,
        height: size,
      }}
      aria-hidden
    >
      <div
        className="pixel-avatar__stage"
        style={{
          width: PIXEL_AVATAR_BASE_PX,
          height: PIXEL_AVATAR_BASE_PX,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
