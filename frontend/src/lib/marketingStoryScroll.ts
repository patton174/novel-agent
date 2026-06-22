/** 分镜 scroll progress → 演示 elapsed / 时间线状态的共享映射 */

export interface SceneTimingSlice {
  sendAt: number
  promptAt: number
  agentAt: number
  outputAt: number
  runEnd: number
}

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

/** 先慢 → 中间快 → 后慢，用于分镜滚动驱动动画 */
export function easeInOutCubic(t: number) {
  const x = clamp01(t)
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

/**
 * 将 section 滚动进度 0–1 映射为演示 elapsed（ms）。
 * progress=1 时到达 runEnd，与分镜滚出视口同步完成动画。
 */
export function scrollProgressToElapsed(progress: number, timing: SceneTimingSlice): number {
  const p = clamp01(progress)
  if (p <= 0) return 0
  if (p >= 0.995) return timing.runEnd

  const keys = [0, 0.16, 0.34, 0.54, 0.74, 1] as const
  const times = [
    0,
    timing.sendAt,
    timing.promptAt,
    timing.agentAt + 600,
    timing.outputAt,
    timing.runEnd,
  ]

  for (let i = 0; i < keys.length - 1; i++) {
    const start = keys[i]!
    const end = keys[i + 1]!
    if (p >= start && p <= end) {
      const t = (p - start) / (end - start)
      return times[i]! + t * (times[i + 1]! - times[i]!)
    }
  }
  return timing.runEnd
}

export function timelineStepState(
  stepIndex: number,
  progress: number,
  total: number,
): 'pending' | 'active' | 'done' {
  const p = clamp01(progress)
  if (p >= 0.995) return 'done'
  const start = stepIndex / total
  const activate = start + 0.08 / total
  const end = (stepIndex + 1) / total
  if (p >= end) return 'done'
  if (p >= activate) return 'active'
  return 'pending'
}

/** 滚动驱动的文案显现样式（opacity + translateY） */
export function scrollRevealStyle(
  progress: number | undefined,
  start: number,
  end: number,
): { opacity: number; transform: string } {
  if (progress === undefined) return { opacity: 1, transform: 'none' }
  const t = clamp01((progress - start) / Math.max(end - start, 0.001))
  return {
    opacity: t,
    transform: `translateY(${(1 - t) * 10}px)`,
  }
}

/** 竖线填充高度（0–100），首尾节点之间插值 */
export function timelineRailFillPct(
  progress: number,
  firstNodePct: number,
  lastNodePct: number,
): number {
  const p = clamp01(progress)
  return firstNodePct + (lastNodePct - firstNodePct) * p
}
