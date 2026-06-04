/** 变形过渡动画层：令牌 + 样式片段 + 组件 + Hook */
export { motion, motionMs, motionTransition } from '../../styles/motion'
export {
  motionInteractiveCss,
  motionMorphCss,
  motionPopCss,
  motionPopSurfaceCss,
  motionIndicatorCss,
  motionPaneCss,
} from './motionStyles'
export { useMotionPhase, type MotionPhase } from './useMotionPhase'
export { MotionMorph, type MotionMorphProps, type MotionMorphPreset } from './MotionMorph'
export { MotionPop, type MotionPopProps, type MotionPopPlacement } from './MotionPop'
export { MotionPane, type MotionPaneProps } from './MotionPane'
export { MotionTabBar, type MotionTabBarProps, type MotionTabItem } from './MotionTabBar'
export {
  MotionSegmentRail,
  type MotionSegmentRailProps,
  type MotionSegmentItem,
} from './MotionSegmentRail'
