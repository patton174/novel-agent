import type {
  AgentEventEnvelope,
  AgentEventPayload,
  AgentStepState,
  AgentSubagentState,
} from '../types/agent'
import { applyTimelineEvent } from './agentStreamTimeline'
import {
  ccToolHumanSubtitle,
  ccToolHumanSubtitleFromPayload,
} from './ccToolDisplay'
import { toolDisplayName } from './agentLabels'
import { normalizeToolName, vfsPathFromPayload } from './agentToolNames'
import { applyMessageSegmentEvent, extractDeliveryTextFromTimeline } from './messageSegment'
import { sanitizeThinkText } from './sanitizeAgentText'

function canonicalChildToolStepId(event: AgentEventEnvelope, fallbackPrefix: string): string {
  const sid = typeof event.step_id === 'string' ? event.step_id.trim() : ''
  if (sid) {
    return sid
  }
  return `${fallbackPrefix}-${event.sequence}`
}

function childStepStatus(
  eventType: string,
  payload: Record<string, unknown>,
): AgentStepState['status'] {
  if (eventType === 'tool.started' || eventType === 'tool.progress') {
    return 'started'
  }
  if (eventType === 'tool.completed') {
    return String(payload.status || '').toLowerCase() === 'error' ? 'failed' : 'completed'
  }
  return 'started'
}

function outputSummaryFromPayload(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.output_summary === 'string' && payload.output_summary.trim()) {
    return payload.output_summary.trim()
  }
  if (typeof payload.display_excerpt === 'string' && payload.display_excerpt.trim()) {
    return payload.display_excerpt.trim()
  }
  return undefined
}

function wireResultLabels(event: AgentEventEnvelope): string[] | undefined {
  const labels = event.payload.result_labels
  if (!Array.isArray(labels)) {
    return undefined
  }
  const out = labels.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
  return out.length > 0 ? out.slice(0, 6) : undefined
}

export function parseSubagentChildEvent(
  event: AgentEventEnvelope,
): AgentEventEnvelope | null {
  if (event.type !== 'subagent.event') {
    return null
  }
  const payload = event.payload as Record<string, unknown>
  const childType = typeof payload.child_type === 'string' ? payload.child_type.trim() : ''
  if (!childType) {
    return null
  }
  const childPayload =
    payload.child_payload && typeof payload.child_payload === 'object'
      ? (payload.child_payload as AgentEventPayload)
      : ({} as AgentEventPayload)
  return {
    type: childType,
    sequence:
      typeof payload.child_sequence === 'number'
        ? payload.child_sequence
        : event.sequence,
    step_id:
      typeof payload.child_step_id === 'string' ? payload.child_step_id : undefined,
    payload: childPayload,
  }
}

export function applySubagentToolStepEvent(
  stepStates: AgentStepState[],
  event: AgentEventEnvelope,
): AgentStepState[] {
  if (
    event.type !== 'tool.started' &&
    event.type !== 'tool.completed' &&
    event.type !== 'tool.progress'
  ) {
    return stepStates
  }

  const payloadRecord = event.payload as Record<string, unknown>
  const toolName =
    typeof payloadRecord.name === 'string' ? payloadRecord.name : undefined
  if (!toolName || normalizeToolName(toolName) === 'Agent') {
    return stepStates
  }
  if (normalizeToolName(toolName) === 'think') {
    return stepStates
  }

  const stepId = canonicalChildToolStepId(event, event.type.replace('.', '-'))
  const outputSummary = outputSummaryFromPayload(payloadRecord)
  const resultLabels = wireResultLabels(event)
  const toolInputRaw =
    payloadRecord.tool_input && typeof payloadRecord.tool_input === 'object'
      ? (payloadRecord.tool_input as Record<string, unknown>)
      : undefined
  const invTool =
    normalizeToolName(toolName) === 'Glob' || normalizeToolName(toolName) === 'Grep'
  const displayExcerpt =
    !invTool && typeof payloadRecord.display_excerpt === 'string'
      ? payloadRecord.display_excerpt
      : undefined
  const toolOutputDetail =
    event.type === 'tool.completed'
      ? typeof payloadRecord.output === 'string' && payloadRecord.output.trim()
        ? payloadRecord.output.trim()
        : displayExcerpt
      : undefined
  const pattern =
    typeof payloadRecord.pattern === 'string' ? payloadRecord.pattern : undefined
  const toolArgs =
    ccToolHumanSubtitle(toolName, {
      path: vfsPathFromPayload(payloadRecord),
      pattern,
      resultLabels,
      outputSummary,
    }) || ccToolHumanSubtitleFromPayload(toolName, payloadRecord)
  const title =
    typeof payloadRecord.display_name === 'string' && payloadRecord.display_name.trim()
      ? payloadRecord.display_name.trim()
      : toolDisplayName(toolName, payloadRecord)

  const step: AgentStepState = {
    stepId,
    type: 'tool',
    status: childStepStatus(event.type, payloadRecord),
    title,
    toolName,
    toolArgs: toolArgs || undefined,
    toolInput: toolInputRaw,
    toolOutputDetail: toolOutputDetail || undefined,
    displayExcerpt: displayExcerpt || undefined,
    detail: toolArgs || outputSummary,
    outputSummary,
    resultLabels: resultLabels?.length ? resultLabels : undefined,
  }

  const idx = stepStates.findIndex((row) => row.stepId === stepId)
  if (event.type === 'tool.started' && idx >= 0) {
    const prev = stepStates[idx]
    if (prev.status === 'completed' || prev.status === 'failed') {
      return stepStates
    }
  }

  if (idx >= 0) {
    const prev = stepStates[idx]
    const next = [...stepStates]
    next[idx] = {
      ...prev,
      ...step,
      toolArgs: step.toolArgs ?? prev.toolArgs,
      toolInput: step.toolInput ?? prev.toolInput,
      toolOutputDetail: step.toolOutputDetail ?? prev.toolOutputDetail,
      displayExcerpt: step.displayExcerpt ?? prev.displayExcerpt,
      outputSummary:
        event.type === 'tool.completed' ? outputSummary : prev.outputSummary ?? step.outputSummary,
      detail: event.type === 'tool.completed' ? step.detail : prev.detail ?? step.detail,
      resultLabels: step.resultLabels ?? prev.resultLabels,
    }
    return next
  }

  return [...stepStates, step]
}

export function applySubagentChildEvent(
  sub: AgentSubagentState,
  child: AgentEventEnvelope,
): AgentSubagentState {
  let timeline = sub.timeline ?? []
  let messageContent = sub.messageContent ?? ''
  let segmentOpen = sub.segmentOpen ?? false

  if (
    child.type === 'message.started' ||
    child.type === 'message.delta' ||
    child.type === 'message.completed'
  ) {
    const seg = applyMessageSegmentEvent(
      { messageContent, segmentOpen, timeline },
      child,
    )
    timeline = seg.timeline
    messageContent = seg.messageContent
    segmentOpen = seg.segmentOpen
  } else {
    timeline = applyTimelineEvent(timeline, child)
  }

  let childStepStates = sub.childStepStates ?? []

  if (
    child.type === 'tool.started' ||
    child.type === 'tool.completed' ||
    child.type === 'tool.progress'
  ) {
    childStepStates = applySubagentToolStepEvent(childStepStates, child)
  }

  let turn = sub.turn
  if (child.type === 'planning.next_step') {
    const rawTurn = child.payload.turn
    if (typeof rawTurn === 'number') {
      turn = rawTurn
    }
  }

  let thinkText = sub.thinkText
  if (child.type === 'reasoning.delta') {
    const text = typeof child.payload.text === 'string' ? child.payload.text : ''
    const clean = sanitizeThinkText(text)
    if (clean) {
      thinkText = sanitizeThinkText(`${thinkText ?? ''}${clean}`)
    }
  }

  const summaryPreview =
    extractDeliveryTextFromTimeline(timeline) ||
    messageContent.trim() ||
    sub.summaryPreview

  return {
    ...sub,
    timeline,
    childStepStates,
    turn,
    thinkText,
    messageContent,
    segmentOpen,
    summaryPreview: summaryPreview || undefined,
  }
}
