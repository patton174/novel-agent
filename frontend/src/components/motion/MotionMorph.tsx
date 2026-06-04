import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import styled from 'styled-components'
import { motionInteractiveCss, motionMorphCss } from './motionStyles'

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
  children,
  ...rest
}: MotionMorphProps) {
  const Root = preset === 'morph' ? MorphRoot : InteractiveRoot
  return <Root as={Component} {...rest}>{children}</Root>
}

const InteractiveRoot = styled.div`
  ${motionInteractiveCss}
`

const MorphRoot = styled.div`
  ${motionMorphCss}
`
