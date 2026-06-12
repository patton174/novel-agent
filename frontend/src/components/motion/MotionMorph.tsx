import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motionInteractiveClass, motionMorphClass } from '@/lib/motionClasses'

export type MotionMorphPreset = 'interactive' | 'morph'

export interface MotionMorphProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  preset?: MotionMorphPreset
  children?: ReactNode
}

/**
 * 通用变形过渡容器。需要悬停/颜色过渡用 interactive；圆角/尺寸全属性 morph 用 morph。
 */
export function MotionMorph({
  as: Component = 'div',
  preset = 'interactive',
  className,
  children,
  ...rest
}: MotionMorphProps) {
  const motionClass = preset === 'morph' ? motionMorphClass() : motionInteractiveClass()
  return (
    <Component className={cn(motionClass, className)} {...rest}>
      {children}
    </Component>
  )
}
