import type { AgentStepState, AgentTimelineBlock } from '../types/agent'
import { isHiddenUiTool } from './agentHiddenTools'
import { isAssistantFallbackContent } from './agentTracePersist'
import { normalizeTimelineBlockIds } from './agentStreamTimeline'
import type { PersistableAssistantMessage } from './agentMessagePersist'
import { repairFlattenedMarkdown } from './normalizeAgentMarkdown'
import {
  extractDeliveryTextFromTimeline,
  timelineHasExplicitDelivery,
} from './messageSegment'

function timelineTextContent(timeline?: AgentTimelineBlock[]): string {
  return (timeline ?? [])
    .filter((b): b is Extract<AgentTimelineBlock, { kind: 'text' }> => b.kind === 'text')
    .map((b) => b.content)
    .filter((chunk) => chunk.trim())
    .join('\n\n')
    .trim()
}

function pickRicherAssistantContent(
  remote: string,
  local: string,
  timeline?: AgentTimelineBlock[],
): string {
  const fromTimeline = extractDeliveryTextFromTimeline(timeline ?? [])
  if (fromTimeline.trim()) {
    return repairFlattenedMarkdown(fromTimeline)
  }
  const fromLegacyTimeline = timelineTextContent(timeline)
  const candidates = [fromLegacyTimeline, local, remote].filter((c) => c.trim())
  if (candidates.length === 0) {
    return remote
  }
  candidates.sort(
    (a, b) => (b.match(/\n/g)?.length ?? 0) - (a.match(/\n/g)?.length ?? 0),
  )
  return repairFlattenedMarkdown(candidates[0])
}

function runIdsMatch(a?: string, b?: string): boolean {
  return Boolean(a && b && a === b)
}

export function hasAgentTrace(message: PersistableAssistantMessage): boolean {
  if (message.agentThinkText?.trim()) {
    return true
  }
  if (message.agentTodos && message.agentTodos.length > 0) {
    return true
  }
  if (message.agentTimeline && message.agentTimeline.length > 0) {
    return true
  }
  return Boolean(
    message.agentSteps?.some(
      (s) => s.type === 'tool' && !isHiddenUiTool(s.toolName),
    ),
  )
}

/** 为旧消息或缺 timeline 的持久化记录补全可回放时间线 */
export function ensureReplayTimeline(message: PersistableAssistantMessage): AgentTimelineBlock[] {
  if (message.agentTimeline && message.agentTimeline.length > 0) {
    return normalizeTimelineBlockIds(message.agentTimeline)
  }

  const blocks: AgentTimelineBlock[] = []
  const think = message.agentThinkText?.trim()
  if (think) {
    blocks.push({
      kind: 'think',
      id: `think-replay-${message.id}`,
      text: think,
      status: 'done',
    })
  }

  for (const step of message.agentSteps ?? []) {
    if (step.type !== 'tool' || isHiddenUiTool(step.toolName)) {
      continue
    }
    blocks.push({
      kind: 'tool',
      id: `tool-replay:${step.stepId}`,
      stepId: step.stepId,
    })
  }

  if (message.content?.trim()) {
    blocks.push({
      kind: 'text',
      id: `text-replay-${message.id}`,
      content: repairFlattenedMarkdown(message.content),
      frozen: true,
      delivery: true,
    })
  }

  return normalizeTimelineBlockIds(blocks)
}

function stepRichnessScore(step: AgentStepState): number {
  let score = 0
  if (step.displayExcerpt?.trim()) {
    score += 4
  }
  if (step.toolOutputDetail?.trim()) {
    score += 3
  }
  if (step.resultLabels?.length) {
    score += 2
  }
  if (step.outputSummary?.trim()) {
    score += 1
  }
  return score
}

/** 合并同 stepId：保留 displayExcerpt / resultLabels 更完整的一侧（刷新后仍能看 Read 摘要） */
export function mergeStepStatesPreferRicher(
  remote?: AgentStepState[],
  local?: AgentStepState[],
): AgentStepState[] | undefined {
  if (!local?.length) {
    return remote
  }
  if (!remote?.length) {
    return local
  }
  const byId = new Map(remote.map((s) => [s.stepId, { ...s }]))
  for (const ls of local) {
    const rs = byId.get(ls.stepId)
    if (!rs) {
      byId.set(ls.stepId, { ...ls })
      continue
    }
    const preferLocal = stepRichnessScore(ls) > stepRichnessScore(rs)
    const primary = preferLocal ? ls : rs
    const secondary = preferLocal ? rs : ls
    byId.set(ls.stepId, {
      ...secondary,
      ...primary,
      displayExcerpt: primary.displayExcerpt ?? secondary.displayExcerpt,
      toolOutputDetail: primary.toolOutputDetail ?? secondary.toolOutputDetail,
      resultLabels: primary.resultLabels?.length
        ? primary.resultLabels
        : secondary.resultLabels,
      outputSummary: primary.outputSummary ?? secondary.outputSummary,
      detail: primary.detail ?? secondary.detail,
      toolArgs: primary.toolArgs ?? secondary.toolArgs,
      title: primary.title ?? secondary.title,
    })
  }
  return [...byId.values()]
}

function preferLocalTimeline(
  local?: AgentTimelineBlock[],
  remote?: AgentTimelineBlock[],
): AgentTimelineBlock[] | undefined {
  if (!local?.length) {
    return remote
  }
  if (!remote?.length) {
    return local
  }
  if (timelineHasExplicitDelivery(local) && !timelineHasExplicitDelivery(remote)) {
    return local
  }
  if (timelineHasExplicitDelivery(remote) && !timelineHasExplicitDelivery(local)) {
    return remote
  }
  const localScore = timelineRichnessScore(local)
  const remoteScore = timelineRichnessScore(remote)
  return localScore >= remoteScore ? local : remote
}

function timelineRichnessScore(timeline: AgentTimelineBlock[]): number {
  let score = timeline.length
  for (const block of timeline) {
    if (block.kind === 'text' || block.kind === 'narration') {
      score += block.content.length
      if (block.delivery !== undefined) {
        score += 1000
      }
    }
    if (block.kind === 'tool') {
      score += 10
    }
  }
  return score
}

export function mergeRemoteWithLocalTrace<T extends PersistableAssistantMessage>(
  remote: T[],
  local: T[],
): T[] {
  if (local.length === 0) {
    return remote
  }

  const localById = new Map(local.map((m) => [m.id, m]))
  const usedLocal = new Set<string>()

  const merged = remote.map((remoteMsg, index) => {
    let localMsg = localById.get(remoteMsg.id)
    if (!localMsg && remoteMsg.role === 'assistant') {
      localMsg = local.find(
        (m, li) =>
          m.role === 'assistant' &&
          !usedLocal.has(m.id) &&
          (runIdsMatch(m.agentRunId, remoteMsg.agentRunId) ||
            m.content === remoteMsg.content ||
            (index > 0 && li === index - 1) ||
            Math.abs(m.timestamp.getTime() - remoteMsg.timestamp.getTime()) < 60_000),
      )
    }
    const remoteHasTrace = hasAgentTrace(remoteMsg)
    const localHasTrace = Boolean(localMsg && hasAgentTrace(localMsg))
    if (!localMsg || (!localHasTrace && !remoteHasTrace)) {
      return remoteMsg
    }
    usedLocal.add(localMsg.id)
    const preferLocalContent =
      localHasTrace &&
      isAssistantFallbackContent(remoteMsg.content) &&
      Boolean(localMsg.content?.trim())
    const mergedTimeline =
      preferLocalTimeline(localMsg.agentTimeline, remoteMsg.agentTimeline) ??
      remoteMsg.agentTimeline ??
      localMsg.agentTimeline
    const mergedContent = pickRicherAssistantContent(
      preferLocalContent ? localMsg.content : remoteMsg.content,
      localMsg.content,
      mergedTimeline,
    )
    return {
      ...remoteMsg,
      content: mergedContent,
      agentRunId: remoteMsg.agentRunId ?? localMsg.agentRunId,
      agentThinkText: remoteMsg.agentThinkText ?? localMsg.agentThinkText,
      agentSteps:
        mergeStepStatesPreferRicher(remoteMsg.agentSteps, localMsg.agentSteps) ??
        remoteMsg.agentSteps ??
        localMsg.agentSteps,
      agentTimeline: mergedTimeline,
      agentTodos: remoteMsg.agentTodos ?? localMsg.agentTodos,
      agentStreamPhase: remoteMsg.agentStreamPhase ?? localMsg.agentStreamPhase,
      agentAwaitingInteraction:
        remoteMsg.agentAwaitingInteraction ?? remoteMsg.agentAwaitingInteraction,
    }
  })

  for (const localMsg of local) {
    if (usedLocal.has(localMsg.id) || localById.has(localMsg.id)) {
      continue
    }
    if (localMsg.role === 'assistant' && hasAgentTrace(localMsg)) {
      merged.push(localMsg)
    }
  }

  return merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

export function findStepForTimelineTool(
  stepStates: AgentStepState[],
  stepId: string,
  _renderedStepIds: Set<string>,
): AgentStepState | undefined {
  return stepStates.find((s) => s.stepId === stepId)
}
