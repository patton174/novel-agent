import type { AgentEventEnvelope, AgentTimelineBlock } from '../types/agent'
import {
  appendMessageDeltaContent,
  isWriteChapterStreamLeak,
  sanitizeMessageDeltaChunk,
  stripChoiceBlocksFromMessage,
} from './sanitizeAgentText'

export type MessageSegmentState = {
  messageContent: string
  segmentOpen: boolean
  timeline: AgentTimelineBlock[]
}

export function initialMessageSegmentState(
  timeline: AgentTimelineBlock[] = [],
): MessageSegmentState {
  return {
    messageContent: '',
    segmentOpen: false,
    timeline,
  }
}

export function parseMessageDelivery(payload: Record<string, unknown> | undefined): boolean {
  if (payload?.delivery === false) {
    return false
  }
  if (payload?.delivery === true) {
    return true
  }
  // Legacy completed without delivery → treat as reply body
  return true
}

function findLastIndex<T>(arr: T[], pred: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    if (pred(arr[i])) {
      return i
    }
  }
  return -1
}

function uniqueTextBlockId(timeline: AgentTimelineBlock[], stepId?: string): string {
  const base = stepId?.trim() ? `text:${stepId}` : `text-${timeline.length + 1}`
  if (!timeline.some((block) => block.id === base)) {
    return base
  }
  for (let i = 2; ; i += 1) {
    const candidate = `${base}:${i}`
    if (!timeline.some((block) => block.id === candidate)) {
      return candidate
    }
  }
}

export function commitMessageSegmentToTimeline(
  timeline: AgentTimelineBlock[],
  content: string,
  delivery: boolean,
  stepId?: string,
): AgentTimelineBlock[] {
  const trimmed = content.trim()
  if (!trimmed) {
    return timeline
  }
  return [
    ...timeline,
    {
      kind: 'text',
      id: uniqueTextBlockId(timeline, stepId),
      content: trimmed,
      frozen: true,
      delivery,
    },
  ]
}

export function applyMessageSegmentEvent(
  state: MessageSegmentState,
  event: AgentEventEnvelope,
  opts?: { stripChoiceBlock?: boolean; choiceTitles?: string[] },
): MessageSegmentState {
  const type = event.type
  const stepId = typeof event.step_id === 'string' ? event.step_id.trim() : undefined

  if (type === 'message.started') {
    return {
      ...state,
      messageContent: '',
      segmentOpen: true,
    }
  }

  if (type === 'message.delta') {
    const raw = typeof event.payload.text === 'string' ? event.payload.text : ''
    const text = sanitizeMessageDeltaChunk(raw)
    if (!text || isWriteChapterStreamLeak(text)) {
      return state
    }
    let merged = appendMessageDeltaContent(state.messageContent, text)
    if (opts?.stripChoiceBlock) {
      merged = stripChoiceBlocksFromMessage(merged, { choiceTitles: opts.choiceTitles })
    }
    return {
      ...state,
      messageContent: merged,
      segmentOpen: true,
    }
  }

  if (type === 'message.completed') {
    const delivery = parseMessageDelivery(event.payload as Record<string, unknown>)
    const timeline = commitMessageSegmentToTimeline(
      state.timeline,
      state.messageContent,
      delivery,
      stepId,
    )
    return {
      timeline,
      messageContent: '',
      segmentOpen: false,
    }
  }

  return state
}

/** Blocks explicitly marked as reply body (SSE delivery:true). */
export function collectDeliveryBlockIds(timeline: AgentTimelineBlock[]): Set<string> {
  const ids = new Set<string>()
  for (const block of timeline) {
    if (block.kind !== 'text' && block.kind !== 'narration') {
      continue
    }
    if (block.delivery === true && block.content.trim()) {
      ids.add(block.id)
    }
  }
  return ids
}

export function timelineHasExplicitDelivery(timeline: AgentTimelineBlock[]): boolean {
  return timeline.some(
    (block) =>
      (block.kind === 'text' || block.kind === 'narration') && block.delivery === true,
  )
}

/** Reply prose for persistence / replay (delivery:true blocks only). */
export function extractDeliveryTextFromTimeline(timeline: AgentTimelineBlock[]): string {
  const deliveryIds = collectDeliveryBlockIds(timeline)
  if (deliveryIds.size > 0) {
    return timeline
      .filter(
        (block): block is Extract<AgentTimelineBlock, { kind: 'text' | 'narration' }> =>
          (block.kind === 'text' || block.kind === 'narration') && deliveryIds.has(block.id),
      )
      .map((block) => block.content)
      .join('\n\n')
      .trim()
  }
  return ''
}

/** Orchestration prose blocks (delivery:false). */
export function extractOrchestrationTextFromTimeline(timeline: AgentTimelineBlock[]): string {
  return timeline
    .filter(
      (block): block is Extract<AgentTimelineBlock, { kind: 'text' | 'narration' }> =>
        (block.kind === 'text' || block.kind === 'narration') &&
        block.delivery === false &&
        Boolean(block.content.trim()),
    )
    .map((block) => block.content)
    .join('\n\n')
    .trim()
}

/** Open segment + committed blocks — for live streaming display. */
export function mergeOpenSegmentWithTimeline(
  timeline: AgentTimelineBlock[],
  messageContent: string,
  delivery?: boolean,
): string {
  const committed =
    delivery === undefined
      ? timeline
          .filter(
            (b): b is Extract<AgentTimelineBlock, { kind: 'text' }> =>
              b.kind === 'text' && Boolean(b.content.trim()),
          )
          .map((b) => b.content)
          .join('')
      : timeline
          .filter(
            (b): b is Extract<AgentTimelineBlock, { kind: 'text' }> =>
              b.kind === 'text' && b.delivery === delivery && Boolean(b.content.trim()),
          )
          .map((b) => b.content)
          .join('')
  return `${committed}${messageContent}`.trim()
}

export function lastOpenTextBlockIndex(timeline: AgentTimelineBlock[]): number {
  return findLastIndex(
    timeline,
    (b) => b.kind === 'text' && !b.frozen && Boolean(b.content.trim()),
  )
}
