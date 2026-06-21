import { useEffect, useRef, type ComponentType, type ForwardRefExoticComponent, type RefAttributes, type SVGProps } from 'react'
import { cn } from '@/lib/utils'

/** 图标组件 props：size/stroke + 透传 svg 属性。 */
export interface ProIconLikeProps extends Omit<SVGProps<SVGSVGElement>, 'stroke'> {
  size?: string | number
  stroke?: string | number
  title?: string
}

/**
 * 图标组件类型：兼容两类——
 *  1. tabler 的 ForwardRefExoticComponent（带 $$typeof）
 *  2. 自研原创 SVG 的普通函数组件（ProIconProps）
 * 描边动画只依赖 svg 内 path/line/...，不依赖图标组件形态，故用 ComponentType 放宽。
 */
export type ProIconType = ComponentType<ProIconLikeProps>

/** 对齐 @tabler/icons-react 的图标组件类型（保留以兼容旧引用）。 */
export type TablerIcon = ForwardRefExoticComponent<ProIconLikeProps & RefAttributes<SVGSVGElement>>

export interface IconStrokeProps {
  /** 图标组件（tabler 或自研 proIcons 均可） */
  icon: ProIconType
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
 * 图标包裹层，兼两种图标形态：
 * - line/stroke 图标（tabler 等）：active 时给 svg 内描边子元素设 pathLength=1（SVG 属性，
 *   非 CSS——CSS 无法设 pathLength），配合 pro.css 的 stroke-dasharray:1 + stroke-dashoffset 1→0
 *   做 ~420ms 绘制过渡，indigo 强调。
 * - duotone 填充图标（Solar bold-duotone，见 proIcons.tsx）：描边动画对 fill 无效，
 *   active 改由 .pro-icon-fill--active 的配色（primary）+ 轻微缩放 + 柔阴影表达。
 *   两套 class 同时挂上，互不干扰——描边动画只作用于有 stroke 的元素，缩放/配色作用于整个 svg。
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
        'inline-flex items-center justify-center transition-all duration-200',
        active && 'pro-icon-stroke--active pro-icon-fill--active',
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
