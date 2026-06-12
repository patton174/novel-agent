import {
  THINKING_HAND_FINGER,
  THINKING_HAND_HAND,
  THINKING_HAND_LOADER,
  THINKING_HAND_PALM,
  THINKING_HAND_THUMB,
} from '@/lib/shimmerClasses'

/** 思考中专用动画（配色适配 Novel AI 金色主题） */
export function ThinkingHandLoader() {
  return (
    <div className={THINKING_HAND_LOADER} aria-hidden>
      <div className={THINKING_HAND_HAND}>
        <div className={THINKING_HAND_FINGER} />
        <div className={THINKING_HAND_FINGER} />
        <div className={THINKING_HAND_FINGER} />
        <div className={THINKING_HAND_FINGER} />
        <div className={THINKING_HAND_PALM} />
        <div className={THINKING_HAND_THUMB} />
      </div>
    </div>
  )
}
