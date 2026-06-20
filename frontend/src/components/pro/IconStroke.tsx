import { useEffect, useRef, type ForwardRefExoticComponent, type RefAttributes, type SVGProps } from 'react'
import { cn } from '@/lib/utils'

/** 对齐 @tabler/icons-react 的图标组件类型（ForwardRefExoticComponent，stroke 接受 string|number）。
 *  tabler 未导出其内部 TablerIcon/IconProps，这里按其 d.ts 精确复刻，避免 propTypes 校验不兼容。 */
export type TablerIcon = ForwardRefExoticComponent<
  (Omit<SVGProps<SVGSVGElement>, 'stroke'> & {
    stroke?: string | number
    size?: string | number
    title?: string
  }) &
    RefAttributes<SVGSVGElement>
>

export interface IconStrokeProps {
  /** tabler 图标组件，如 IconHome */
  icon: TablerIcon
  /** 无障碍标签；省略时图标对辅助技术隐藏（适用于图标旁已有可见文字的场景） */
  label?: string
  /** 是否选中态（触发描边绘制动画） */
  active?: boolean
  /** 用户偏好减少动画（跳过绘制过渡，直接显示） */
  prefersReducedMotion?: boolean
  className?: string
  size?: number | string
}

/**
 * tabler line-icon 描边动画包裹层。
 * - 默认态：淡色（currentColor）正常显示。
 * - active 态：给 svg 内所有可绘子元素设 pathLength=1（SVG 属性，非 CSS——CSS 无法设 pathLength），
 *   配合 pro.css 的 stroke-dasharray:1 + stroke-dashoffset 1→0 做 ~420ms 绘制过渡，
 *   完成后常驻描边，indigo 强调。
 * - label 省略时图标 aria-hidden，由相邻可见文字承载无障碍名称（避免双重播报）。
 */
export function IconStroke({
  icon: Icon,
  label,
  active = false,
  prefersReducedMotion = false,
  className,
  size = 20,
}: IconStrokeProps) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el
      .querySelectorAll('svg path, svg line, svg circle, svg rect, svg polygon, svg polyline')
      .forEach((n) => n.setAttribute('pathLength', '1'))
  }, [Icon])
  return (
    <span
      ref={ref}
      data-icon-stroke=""
      aria-label={label}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      className={cn(
        'inline-flex items-center justify-center',
        active && 'pro-icon-stroke--active',
        prefersReducedMotion && 'pro-icon-stroke--reduced',
        className,
      )}
    >
      <Icon
        size={size}
        stroke={'1.5'}
        aria-hidden="true"
        focusable="false"
      />
    </span>
  )
}
