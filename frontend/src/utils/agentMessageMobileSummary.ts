import type { AgentStepState, AgentTimelineBlock } from '../types/agent'
import type { EditorMessage } from '../types/editor'
import {
  extractTrailingDeliveryProseFromTimeline,
  groupTimelineUnits,
} from './agentStreamTimeline'
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
  return extractTrailingDeliveryProseFromTimeline(timeline)
}

/** 已提升到编排层外的 segment 交付正文（与 groupTimelineUnits 一致，仅最后一段） */
export function extractPromotedSegmentDeliveryText(
  timeline: AgentTimelineBlock[],
  stepStates: AgentStepState[] | undefined,
  streamFinished: boolean,
): string {
  const units = groupTimelineUnits(timeline, stepStates ?? [], { streamFinished })
  for (let i = units.length - 1; i >= 0; i -= 1) {
    const unit = units[i]
    if (unit.kind !== 'segment') {
      continue
    }
    const parts: string[] = []
    for (const block of unit.blocks) {
      if (block.kind === 'text' || block.kind === 'narration') {
        const text = block.content.trim()
        if (text && !isToolErrorLikeText(text)) {
          parts.push(text)
        }
      }
    }
    if (parts.length > 0) {
      return parts.join('').trim()
    }
  }
  return ''
}

function timelineHasOrchestration(
  timeline: AgentTimelineBlock[],
  stepStates: AgentStepState[] | undefined,
): boolean {
  if (
    (stepStates ?? []).some(
      (step) => step.type === 'tool' && step.toolName && !isHiddenUiTool(step.toolName),
    )
  ) {
    return true
  }
  return timeline.some(
    (block) =>
      block.kind === 'tool' ||
      block.kind === 'think' ||
      block.kind === 'reasoning' ||
      block.kind === 'transition' ||
      block.kind === 'narration',
  )
}

/**
 * 编排时间线外的交付正文（EditorChatMessage 底部 TimelineDeliveryBlock）。
 *
 * 规则：
 * - 有编排且流未结束：正文只在编排区内展示（narration/text 与 message.delta 同源），此处返回空
 * - 有编排且流已结束：最后一段正文已由 groupTimelineUnits 提升到 segment，由时间线渲染，此处返回空
 * - 无编排：沿用 message.content
 */
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

  if (!timelineHasOrchestration(timeline, stepStates)) {
    return content
  }

  if (!streamFinished) {
    return ''
  }

  const segmentText = extractPromotedSegmentDeliveryText(timeline, stepStates, streamFinished)
  if (segmentText) {
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
