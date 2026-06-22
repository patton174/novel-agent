import type { MarketingSceneId } from '@/utils/marketing/buildMarketingSceneDemo'

export type TimelineStagger = 'left' | 'right' | 'center'

export interface MarketingTimelineStep {
  id: string
  /** 节点在主轴上的垂直位置（%），与左 bullet / 右 demo 阶段对齐 */
  topPct: number
  /** 节点在竖线上的错落方向 */
  stagger: TimelineStagger
  /** 与左侧 points[] 索引映射 */
  copyPointIndex?: number
  demoPhase: 'composer' | 'orchestrate' | 'think' | 'tool' | 'output'
}

/** 每幕 4 步：意图 → 编排 → 思考 → 输出（topPct 对齐文案 bullet 与 demo 块） */
export const SCENE_TIMELINE_STEPS: Record<MarketingSceneId, MarketingTimelineStep[]> = {
  think: [
    { id: 'intent', topPct: 10, stagger: 'left', demoPhase: 'composer' },
    { id: 'orchestrate', topPct: 32, stagger: 'right', copyPointIndex: 0, demoPhase: 'orchestrate' },
    { id: 'think', topPct: 54, stagger: 'left', copyPointIndex: 1, demoPhase: 'think' },
    { id: 'output', topPct: 76, stagger: 'right', copyPointIndex: 2, demoPhase: 'output' },
  ],
  orchestrate: [
    { id: 'intent', topPct: 10, stagger: 'left', demoPhase: 'composer' },
    { id: 'orchestrate', topPct: 32, stagger: 'right', copyPointIndex: 0, demoPhase: 'orchestrate' },
    { id: 'think', topPct: 54, stagger: 'left', copyPointIndex: 1, demoPhase: 'think' },
    { id: 'tool', topPct: 76, stagger: 'right', copyPointIndex: 2, demoPhase: 'tool' },
  ],
  subagent: [
    { id: 'intent', topPct: 10, stagger: 'left', demoPhase: 'composer' },
    { id: 'orchestrate', topPct: 32, stagger: 'right', copyPointIndex: 0, demoPhase: 'orchestrate' },
    { id: 'think', topPct: 54, stagger: 'left', copyPointIndex: 1, demoPhase: 'think' },
    { id: 'output', topPct: 76, stagger: 'right', copyPointIndex: 2, demoPhase: 'output' },
  ],
  stream: [
    { id: 'intent', topPct: 10, stagger: 'left', demoPhase: 'composer' },
    { id: 'orchestrate', topPct: 32, stagger: 'right', copyPointIndex: 0, demoPhase: 'orchestrate' },
    { id: 'think', topPct: 54, stagger: 'left', copyPointIndex: 1, demoPhase: 'think' },
    { id: 'output', topPct: 76, stagger: 'right', copyPointIndex: 2, demoPhase: 'output' },
  ],
}
