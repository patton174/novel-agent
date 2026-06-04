import type { AgentStepState, AgentTimelineBlock } from '../types/agent'
import { findChoiceSelectedForStep } from './agentStreamTimeline'
import { isCollapsibleReadTool } from './agentToolNames'
import { dedupeLabels } from './agentToolResultLabels'

export type CollapsedTimelineView = {
  blocks: AgentTimelineBlock[]
  /** 合并后的 Read/Grep 组：首块 id → 已读标题列表 */
  mergedMemoryReadTitles: Map<string, string[]>
  /** 合并组内调用次数（仅 count > 1 时写入） */
  mergedMemoryReadCount: Map<string, number>
}

function labelsForReadStep(step: AgentStepState): string[] {
  return step.resultLabels ?? []
}

/** 连续相同 Read/Grep（含 legacy memory_read）只保留首块，并汇总已读标题 */
export function collapseConsecutiveMemoryReads(
  blocks: AgentTimelineBlock[],
  stepByBlockId: Map<string, AgentStepState>,
): CollapsedTimelineView {
  const mergedMemoryReadTitles = new Map<string, string[]>()
  const mergedMemoryReadCount = new Map<string, number>()
  const out: AgentTimelineBlock[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i]
    if (block.kind !== 'tool') {
      out.push(block)
      i += 1
      continue
    }

    const step = stepByBlockId.get(block.id)
    if (!step || !isCollapsibleReadTool(step.toolName) || step.status !== 'completed') {
      out.push(block)
      i += 1
      continue
    }

    const groupSteps = [step]
    let j = i + 1
    while (j < blocks.length) {
      const next = blocks[j]
      if (next.kind !== 'tool') {
        break
      }
      const nextStep = stepByBlockId.get(next.id)
      if (
        !nextStep ||
        !isCollapsibleReadTool(nextStep.toolName) ||
        nextStep.status !== 'completed' ||
        nextStep.title !== step.title
      ) {
        break
      }
      groupSteps.push(nextStep)
      j += 1
    }

    if (groupSteps.length > 1) {
      mergedMemoryReadTitles.set(
        block.id,
        dedupeLabels(groupSteps.flatMap(labelsForReadStep)),
      )
      mergedMemoryReadCount.set(block.id, groupSteps.length)
      out.push(block)
      i = j
      continue
    }

    const singleLabels = labelsForReadStep(step)
    if (singleLabels.length > 0) {
      mergedMemoryReadTitles.set(block.id, singleLabels)
    }
    out.push(block)
    i += 1
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
