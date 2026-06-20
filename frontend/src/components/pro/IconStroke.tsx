import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/lib/utils'

type TablerIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

export interface IconStrokeProps {
  /** tabler 图标组件，如 IconHome */
  icon: TablerIcon
  /** 无障碍标签 */
  label: string
  /** 是否选中态（触发描边绘制动画） */
  active?: boolean
  /** 用户偏好减少动画（跳过绘制过渡，直接显示） */
  prefersReducedMotion?: boolean
  className?: string
  size?: number | string
}

/**
 * tabler line-icon 描边动画包裹层。
 * - 默认态：淡色（text-muted-foreground）正常显示。
 * - active 态：给 svg 内所有 path/line 设 pathLength=1、stroke-dasharray=1、
 *   stroke-dashoffset 1→0 做 ~400ms ease-out 绘制过渡，完成后常驻描边，indigo 强调。
 * 实现：靠 CSS 类 + 全局 keyframes（见 pro.css，Task 3 注入）作用于
 *   [data-icon-stroke--active] svg path/line。
 */
export function IconStroke({
  icon: Icon,
  label,
  active = false,
  prefersReducedMotion = false,
  className,
  size = 20,
}: IconStrokeProps) {
  return (
    <span
      data-icon-stroke=""
      data-active={active ? 'true' : 'false'}
      aria-label={label}
      role="img"
      className={cn(
        'inline-flex items-center justify-center',
        active && 'pro-icon-stroke--active',
        prefersReducedMotion && 'pro-icon-stroke--reduced',
        className,
      )}
    >
      <Icon
        size={size}
        stroke={1.5}
        aria-hidden="true"
        focusable="false"
      />
    </span>
  )
}
