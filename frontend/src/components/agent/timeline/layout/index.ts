/**
 * 编排时间线布局 — 唯一入口
 *
 * | 场景              | 组件组合 |
 * |-------------------|----------|
 * | 思考 / 推理       | TimelineInsightRow |
 * | think_round 工具  | OrchestrationFlatSlot(kind=tool) → CcToolRow / TimelineToolRowShell |
 * | think_round 正文  | OrchestrationFlatSlot(kind=text) → 正文 |
 * | 树状结果行        | TimelineBranchRow（勿直接 ccToolBranchClass） |
 *
 * @see ./types.ts
 */

export type {
  OrchestrationFlatKind,
  TimelineBranchVariant,
  TimelineLayoutTier,
} from './types'

export { OrchestrationFlatSlot } from './OrchestrationFlatSlot'
export type { OrchestrationFlatSlotProps } from './OrchestrationFlatSlot'

export { TimelineBranchRow } from './TimelineBranchRow'
export type { TimelineBranchRowProps } from './TimelineBranchRow'

export { TimelineInsightRow } from './TimelineInsightRow'
export type { TimelineInsightRowProps } from './TimelineInsightRow'

export { TimelineToolRowShell } from './TimelineToolRowShell'
export type { TimelineToolRowShellProps } from './TimelineToolRowShell'
