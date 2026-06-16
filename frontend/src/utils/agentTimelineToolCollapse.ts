import type { AgentStepState, AgentTimelineBlock } from '../types/agent'
import { findChoiceSelectedForStep } from './agentStreamTimeline'
import { isCollapsibleReadTool } from './agentToolNames'
import { dedupeLabels } from './agentToolResultLabels'

export type CollapsedTimelineView = {
  blocks: AgentTimelineBlock[]
  /** Read/Grep 单步 result_labels（不合并多步） */
  mergedMemoryReadTitles: Map<string, string[]>
  /** @deprecated 不再合并连续 Read；保留字段供 Timeline 兼容 */
  mergedMemoryReadCount: Map<string, number>
}

function labelsForReadStep(step: AgentStepState): string[] {
  return step.resultLabels ?? []
}

/** 读取类工具逐步展示，不合并连续 Read/Grep。 */
export function collapseConsecutiveMemoryReads(
  blocks: AgentTimelineBlock[],
  stepByBlockId: Map<string, AgentStepState>,
): CollapsedTimelineView {
  const mergedMemoryReadTitles = new Map<string, string[]>()
  const mergedMemoryReadCount = new Map<string, number>()
  const out: AgentTimelineBlock[] = []

  for (const block of blocks) {
    out.push(block)
    if (block.kind !== 'tool') {
      continue
    }
    const step = stepByBlockId.get(block.id)
    if (!step || !isCollapsibleReadTool(step.toolName) || step.status !== 'completed') {
      continue
    }
    const labels = dedupeLabels(labelsForReadStep(step))
    if (labels.length > 0) {
      mergedMemoryReadTitles.set(block.id, labels)
    }
  }

  return { blocks: out, mergedMemoryReadTitles, mergedMemoryReadCount }
}

function choiceClaimedByTool(
  timeline: AgentTimelineBlock[],
  block: Extract<AgentTimelineBlock, { kind: 'choice_selected' }>,
): boolean {
  return timeline.some(
    (b) =>
      b.kind === 'tool' &&
      findChoiceSelectedForStep(timeline, b.stepId)?.id === block.id,
  )
}

/** 去掉已在工具行内展示的 choice_selected（含无 stepId 但紧跟工具的块） */
export function pruneRedundantChoiceSelected(
  timeline: AgentTimelineBlock[],
): AgentTimelineBlock[] {
  return timeline.filter((block) => {
    if (block.kind !== 'choice_selected') {
      return true
    }
    if (block.stepId) {
      return true
    }
    return !choiceClaimedByTool(timeline, block)
  })
}
