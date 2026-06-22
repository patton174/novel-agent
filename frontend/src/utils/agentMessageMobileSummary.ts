import type { AgentStepState, AgentTimelineBlock } from '../types/agent'
import type { EditorMessage } from '../types/editor'
import { groupTimelineUnits } from './agentStreamTimeline'
import { isHiddenUiTool } from './agentHiddenTools'
import { isToolErrorLikeText } from './toolErrorText'

export function extractAssistantDeliveryText(
  message: EditorMessage,
  timeline: AgentTimelineBlock[],
): string {
  const content = message.content?.trim()
  if (content && !isToolErrorLikeText(content)) {
    return content
  }
  return timeline
    .filter(
      (block): block is Extract<AgentTimelineBlock, { kind: 'text' | 'narration' }> =>
        block.kind === 'text' || block.kind === 'narration',
    )
    .map((block) => block.content)
    .join('')
    .trim()
}

/** 已提升到编排层外的 segment 交付正文（与 groupTimelineUnits 一致） */
export function extractPromotedSegmentDeliveryText(
  timeline: AgentTimelineBlock[],
  stepStates: AgentStepState[] | undefined,
  streamFinished: boolean,
): string {
  const units = groupTimelineUnits(timeline, stepStates ?? [], { streamFinished })
  const parts: string[] = []
  for (const unit of units) {
    if (unit.kind !== 'segment') {
      continue
    }
    for (const block of unit.blocks) {
      if (block.kind === 'text' || block.kind === 'narration') {
        const text = block.content.trim()
        if (text && !isToolErrorLikeText(text)) {
          parts.push(text)
        }
      }
    }
  }
  return parts.join('').trim()
}

export function extractPostTimelineDeliveryText(
  message: EditorMessage,
  timeline: AgentTimelineBlock[],
  stepStates: AgentStepState[] | undefined,
  streamFinished: boolean,
): string {
  const content = message.content?.trim() ?? ''
  if (!content || isToolErrorLikeText(content)) {
    return ''
  }
  if (!streamFinished) {
    return content
  }
  const segmentText = extractPromotedSegmentDeliveryText(timeline, stepStates, streamFinished)
  if (!segmentText) {
    return content
  }
  if (segmentText === content) {
    return ''
  }
  if (segmentText.includes(content)) {
    return ''
  }
  return content
}

export function countOrchestrationSteps(
  stepStates: AgentStepState[] | undefined,
  timeline: AgentTimelineBlock[],
): number {
  const toolSteps = (stepStates ?? []).filter(
    (step) =>
      step.type === 'tool' &&
      step.toolName !== 'output' &&
      !isHiddenUiTool(step.toolName),
  )
  if (toolSteps.length > 0) {
    return toolSteps.length
  }
  return timeline.filter(
    (block) =>
      block.kind === 'tool' ||
      block.kind === 'think' ||
      block.kind === 'reasoning' ||
      block.kind === 'narration',
  ).length
}
