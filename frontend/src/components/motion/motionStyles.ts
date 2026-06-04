import { css } from 'styled-components'
import { motionTransition } from '../../styles/motion'
import type { MotionPhase } from './useMotionPhase'
import type { MotionPopPlacement } from './MotionPop'

/** 悬停/点击类控件的变形过渡 */
export const motionInteractiveCss = css`
  transition: ${motionTransition.interactive};
`

/** 全属性 morph（开关滑块、圆角变化等） */
export const motionMorphCss = css`
  transition: ${motionTransition.morph};
`

/** 下拉/浮层展开收起 */
export function motionPopCss(phase: MotionPhase, placement: MotionPopPlacement = 'bottom') {
  const slideIn = placement === 'top' ? 'translateY(6px)' : 'translateY(-6px)'
  const slideOut = placement === 'top' ? 'translateY(4px)' : 'translateY(-4px)'

  if (phase === 'idle') {
    return css`
      opacity: 1;
      transform: scale(1) translateY(0);
      pointer-events: auto;
    `
  }
  if (phase === 'exit') {
    return css`
      opacity: 0;
      transform: scale(0.97) ${slideOut};
      pointer-events: none;
    `
  }
  return css`
    opacity: 0;
    transform: scale(0.94) ${slideIn};
    pointer-events: none;
  `
}

export const motionPopSurfaceCss = (placement: MotionPopPlacement = 'bottom') => css`
  transform-origin: ${placement === 'top' ? 'center bottom' : 'center top'};
  transition: ${motionTransition.pop};
`

/** Tab / 分段指示块滑动 */
export const motionIndicatorCss = css`
  transition: ${motionTransition.indicator};
`

/** 主面板切换淡入 */
export function motionPaneCss(phase: MotionPhase) {
  return css`
    transition: ${motionTransition.pop};
    opacity: ${phase === 'idle' ? 1 : 0.4};
    transform: ${phase === 'idle' ? 'translateY(0)' : 'translateY(8px)'};
  `
}
