import type {
  AgentChoiceOption,
  AgentEventEnvelope,
  AgentStepState,
  AgentTimelineBlock,
  SkillTimelineStatus,
} from '../types/agent'
import i18n from '@/i18n'
import {
  isHiddenTimelineToolName,
  orchestrationCompletedTitle,
  plannedToolCallsFromPayload,
  isPlanningGenericTitle,
  planningActiveLabel,
  planningPrepTitle,
} from './agentOrchestration'
import { formatRunToolStats, formatRunToolStatsCompact } from './agentToolStats'
import { isHiddenUiTool } from './agentHiddenTools'
import { isAskUserTool } from './agentToolNames'
import { sanitizeMessageDeltaChunk, sanitizeThinkText } from './sanitizeAgentText'
import { isToolErrorLikeText } from './toolErrorText'
import {
  collectDeliveryBlockIds,
  timelineHasExplicitDelivery,
} from './messageSegment'

export { isPlanningGenericTitle } from './agentOrchestration'

function planningSegmentEnd(timeline: AgentTimelineBlock[], planStepId: string): number {
  if (!planStepId) {
    return timeline.length
  }
  const transitionId = `transition:${planStepId}`
  const transitionIdx = timeline.findIndex(
    (b) => b.kind === 'transition' && b.id === transitionId,
  )
  if (transitionIdx < 0) {
    return timeline.length
  }
  for (let i = transitionIdx + 1; i < timeline.length; i += 1) {
    if (timeline[i].kind === 'transition') {
      return i
    }
  }
  return timeline.length
}

function seedPlannedToolBlocks(
  timeline: AgentTimelineBlock[],
  payload: Record<string, unknown>,
  planStepId: string,
): AgentTimelineBlock[] {
  const calls = plannedToolCallsFromPayload(payload, planStepId)
  if (calls.length === 0) {
    return timeline
  }
  const insertIdx = planningSegmentEnd(timeline, planStepId)
  const newBlocks: AgentTimelineBlock[] = []
  for (const call of calls) {
    if (isHiddenTimelineToolName(call.tool)) {
      continue
    }
    if (timeline.some((b) => b.kind === 'tool' && b.stepId === call.toolCallId)) {
      continue
    }
    newBlocks.push({
      kind: 'tool',
      id: uniqueBlockId([...timeline, ...newBlocks], 'tool', call.toolCallId),
      stepId: call.toolCallId,
    })
  }
  if (newBlocks.length === 0) {
    return timeline
  }
  return freezeTrailingStreamBlocks([
    ...timeline.slice(0, insertIdx),
    ...newBlocks,
    ...timeline.slice(insertIdx),
  ])
}

/** 从 timeline 中最近的 planning.completed transition 或 step 统计提取编排概览 */
export function orchestrationOverviewFromTimeline(
  timeline: AgentTimelineBlock[],
  stepStates?: AgentStepState[],
  options?: { streamFinished?: boolean; compact?: boolean },
): string | undefined {
  const stats =
    options?.streamFinished && stepStates?.length
      ? options.compact
        ? formatRunToolStatsCompact(stepStates)
        : formatRunToolStats(stepStates)
      : null
  if (stats) {
    return stats
  }
  for (let i = timeline.length - 1; i >= 0; i -= 1) {
    const block = timeline[i]
    if (block.kind !== 'transition' || block.status !== 'done') {
      continue
    }
    const title = block.title?.trim() ?? ''
    if (title && !isPlanningGenericTitle(title)) {
      return title
    }
  }
  return undefined
}

function freezeTrailingStreamBlocks(timeline: AgentTimelineBlock[]): AgentTimelineBlock[] {
  const lastTextIdx = findLastIndex(timeline, (b) => b.kind === 'text' && !b.frozen)
  const lastNarrIdx = findLastIndex(timeline, (b) => b.kind === 'narration' && !b.frozen)
  if (lastTextIdx < 0 && lastNarrIdx < 0) {
    return timeline
  }
  return timeline.map((block, idx) => {
    if (block.kind === 'text' && !block.frozen && idx === lastTextIdx) {
      return { ...block, frozen: true }
    }
    if (block.kind === 'narration' && !block.frozen && idx === lastNarrIdx) {
      return { ...block, frozen: true }
    }
    return block
  })
}

function findLastIndex<T>(arr: T[], pred: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    if (pred(arr[i])) {
      return i
    }
  }
  return -1
}

/** Run 级事件会复用同一 step_id；块 id 必须在本条消息 timeline 内唯一。 */
function uniqueBlockId(
  timeline: AgentTimelineBlock[],
  kind: AgentTimelineBlock['kind'],
  stepId: string,
): string {
  const base = `${kind}:${stepId}`
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

function blockSeedId(block: AgentTimelineBlock, index: number): string {
  if (block.kind === 'tool') {
    return block.stepId
  }
  if (block.kind === 'skill') {
    return block.skillId
  }
  if (block.id && block.id !== 'think-pending') {
    return block.id.replace(/^(transition|think|tool):/, '')
  }
  return `${block.kind}-${index}`
}

function parseSkillFromPayload(payload: Record<string, unknown>): { skillId: string; name: string } {
  const skill = payload.skill
  if (skill && typeof skill === 'object') {
    const s = skill as Record<string, unknown>
    const id = typeof s.id === 'string' ? s.id : typeof s.name === 'string' ? s.name : ''
    const name =
      typeof s.name === 'string'
        ? s.name
        : typeof s.display_name === 'string'
          ? s.display_name
          : id || 'Skill'
    return { skillId: id || name, name }
  }
  const name =
    typeof payload.name === 'string'
      ? payload.name
      : typeof payload.display_name === 'string'
        ? payload.display_name
        : 'Skill'
  return { skillId: name, name }
}

function upsertSkillBlock(
  timeline: AgentTimelineBlock[],
  stepId: string,
  skillId: string,
  name: string,
  status: SkillTimelineStatus,
): AgentTimelineBlock[] {
  const blockId = uniqueBlockId(timeline, 'skill', stepId || skillId)
  const existingIdx = timeline.findIndex(
    (b) => b.kind === 'skill' && (b.skillId === skillId || b.id === blockId),
  )
  if (existingIdx >= 0) {
    const block = timeline[existingIdx]
    if (block.kind === 'skill') {
      const next = [...timeline]
      next[existingIdx] = { ...block, name, status }
      return next
    }
  }
  return [
    ...timeline,
    {
      kind: 'skill',
      id: blockId,
      skillId,
      name,
      status,
    },
  ]
}

/** 修复旧持久化数据或 run 级 step_id 复用导致的重复 block.id */
export function normalizeTimelineBlockIds(
  timeline: AgentTimelineBlock[],
): AgentTimelineBlock[] {
  const seenIds = new Set<string>()
  const normalized: AgentTimelineBlock[] = []
  timeline.forEach((block, index) => {
    let id = block.id
    if (!id || seenIds.has(id)) {
      id = uniqueBlockId(normalized, block.kind, blockSeedId(block, index))
    }
    seenIds.add(id)
    normalized.push({ ...block, id })
  })
  return normalized
}

/** 将 message.delta 写入时间线（最终交付正文） */
export function appendTextDelta(timeline: AgentTimelineBlock[], delta: string): AgentTimelineBlock[] {
  if (!delta) {
    return timeline
  }
  const lastTextIdx = findLastIndex(timeline, (b) => b.kind === 'text')
  if (lastTextIdx >= 0) {
    const last = timeline[lastTextIdx]
    if (last.kind === 'text' && !last.frozen) {
      const next = [...timeline]
      next[lastTextIdx] = { ...last, content: `${last.content}${delta}` }
      return next
    }
  }
  return [
    ...timeline,
    {
      kind: 'text',
      id: `text-${timeline.length + 1}`,
      content: delta,
      frozen: false,
    },
  ]
}

/**
 * 终轮无 tool_use 时：最后一个 tool 之后的 narration/text 视为交付正文，
 * 从编排时间线剥离并写入 messageContent（仅当尚无 message.delta 正文时）。
 */
export function promoteTrailingNarrationToDelivery(
  timeline: AgentTimelineBlock[],
  messageContent: string,
): { timeline: AgentTimelineBlock[]; messageContent: string } {
  if (messageContent.trim()) {
    return { timeline, messageContent }
  }

  const lastToolIdx = findLastIndex(timeline, (b) => b.kind === 'tool')
  const tailStart = lastToolIdx + 1
  if (tailStart >= timeline.length) {
    return { timeline, messageContent }
  }

  const removeIdx = new Set<number>()
  let promotedText = ''

  for (let idx = tailStart; idx < timeline.length; idx += 1) {
    const block = timeline[idx]
    if (block.kind === 'narration' || block.kind === 'text') {
      if (block.content.trim()) {
        promotedText += block.content
        removeIdx.add(idx)
      }
      continue
    }
    break
  }

  const trimmed = promotedText.trim()
  if (!trimmed) {
    return { timeline, messageContent }
  }

  return {
    timeline: timeline.filter((_, idx) => !removeIdx.has(idx)),
    messageContent: trimmed,
  }
}

/** 编排叙述：与工具同级展示，区别于 output 交付正文 */
export function appendNarrationDelta(
  timeline: AgentTimelineBlock[],
  delta: string,
): AgentTimelineBlock[] {
  if (!delta) {
    return timeline
  }
  const lastNarrIdx = findLastIndex(timeline, (b) => b.kind === 'narration')
  if (lastNarrIdx >= 0) {
    const last = timeline[lastNarrIdx]
    if (last.kind === 'narration' && !last.frozen) {
      const next = [...timeline]
      next[lastNarrIdx] = { ...last, content: `${last.content}${delta}` }
      return next
    }
  }
  return [
    ...timeline,
    {
      kind: 'narration',
      id: `narration-${timeline.length + 1}`,
      content: delta,
      frozen: false,
    },
  ]
}

/** 编排 LLM 占位文案，不写入 reasoning 正文 */
const PLAN_REASONING_PLACEHOLDER = /^(?:正在调用模型|正在执行|正在调用编排模型|正在编排)[….]*\s*$|^第\s*\d+\s*次重试(?:执行|编排)[….]*\s*$/u

function isPlanReasoningPlaceholder(delta: string): boolean {
  return PLAN_REASONING_PLACEHOLDER.test(delta.trim())
}

function appendReasoningDelta(timeline: AgentTimelineBlock[], delta: string): AgentTimelineBlock[] {
  if (isPlanReasoningPlaceholder(delta)) {
    return timeline
  }
  const clean = sanitizeThinkText(delta)
  if (!clean) {
    return timeline
  }
  const lastIdx = findLastIndex(timeline, (b) => b.kind === 'reasoning' && b.status === 'active')
  if (lastIdx < 0) {
    return [
      ...timeline,
      {
        kind: 'reasoning',
        id: `reasoning-${timeline.length + 1}`,
        text: clean,
        status: 'active',
      },
    ]
  }
  const block = timeline[lastIdx]
  if (block.kind !== 'reasoning') {
    return timeline
  }
  const next = [...timeline]
  next[lastIdx] = { ...block, text: `${block.text}${clean}` }
  return next
}

function thinkBlockMatchesStep(block: AgentTimelineBlock, stepId: string): boolean {
  if (block.kind !== 'think') {
    return false
  }
  const base = `think:${stepId}`
  return block.id === base || block.id.startsWith(`${base}:`)
}

function findThinkBlockIndex(timeline: AgentTimelineBlock[], stepId?: string): number {
  if (stepId?.trim()) {
    const byStep = timeline.findIndex((b) => thinkBlockMatchesStep(b, stepId.trim()))
    if (byStep >= 0) {
      return byStep
    }
  }
  const activeIdx = findLastIndex(timeline, (b) => b.kind === 'think' && b.status === 'active')
  if (activeIdx >= 0) {
    return activeIdx
  }
  return findLastIndex(timeline, (b) => b.kind === 'think')
}

/** 工具/编排 transition 之后不得复用旧思考块，否则正文会挤到时间线前段 */
function canReopenThinkBlock(timeline: AgentTimelineBlock[], thinkIdx: number): boolean {
  for (let i = thinkIdx + 1; i < timeline.length; i += 1) {
    const block = timeline[i]
    if (block.kind === 'tool' || block.kind === 'transition') {
      return false
    }
  }
  return true
}

function appendActiveThinkBlock(
  timeline: AgentTimelineBlock[],
  text: string,
  stepId?: string,
): AgentTimelineBlock[] {
  return [
    ...timeline,
    {
      kind: 'think' as const,
      id: stepId ? uniqueBlockId(timeline, 'think', stepId) : `think-${timeline.length + 1}`,
      text,
      status: 'active' as const,
    },
  ]
}

function appendThinkDelta(
  timeline: AgentTimelineBlock[],
  delta: string,
  stepId?: string,
): AgentTimelineBlock[] {
  const clean = sanitizeThinkText(delta)
  if (!clean) {
    return timeline
  }
  const targetIdx = findThinkBlockIndex(timeline, stepId)
  if (targetIdx < 0) {
    return appendActiveThinkBlock(timeline, clean, stepId)
  }
  const block = timeline[targetIdx]
  if (block.kind !== 'think') {
    return timeline
  }
  if (
    block.status === 'done' &&
    stepId &&
    !thinkBlockMatchesStep(block, stepId)
  ) {
    return appendActiveThinkBlock(timeline, clean, stepId)
  }
  if (block.status === 'done' && !canReopenThinkBlock(timeline, targetIdx)) {
    return appendActiveThinkBlock(timeline, clean, stepId)
  }
  const next = [...timeline]
  next[targetIdx] = {
    ...block,
    text: `${block.text}${clean}`,
    status: 'active',
  }
  return next
}

export function appendChoiceSelected(
  timeline: AgentTimelineBlock[],
  choice: AgentChoiceOption,
  stepId?: string,
): AgentTimelineBlock[] {
  const id = `choice-selected-${choice.id}`
  if (timeline.some((b) => b.kind === 'choice_selected' && b.id === id)) {
    return timeline
  }
  const block: Extract<AgentTimelineBlock, { kind: 'choice_selected' }> = {
    kind: 'choice_selected',
    id,
    title: choice.title,
    description: choice.description || undefined,
    stepId,
  }
  if (!stepId) {
    return [...timeline, block]
  }
  const toolIdx = findLastIndex(timeline, (b) => b.kind === 'tool' && b.stepId === stepId)
  if (toolIdx < 0) {
    return [...timeline, block]
  }
  const next = [...timeline]
  next.splice(toolIdx + 1, 0, block)
  return next
}

export function findChoiceSelectedForStep(
  timeline: AgentTimelineBlock[],
  stepId: string,
): Extract<AgentTimelineBlock, { kind: 'choice_selected' }> | undefined {
  const toolIdx = timeline.findIndex((b) => b.kind === 'tool' && b.stepId === stepId)
  if (toolIdx >= 0) {
    const following = timeline[toolIdx + 1]
    if (
      following?.kind === 'choice_selected' &&
      (!following.stepId || following.stepId === stepId)
    ) {
      return following
    }
  }
  return timeline.find(
    (b): b is Extract<AgentTimelineBlock, { kind: 'choice_selected' }> =>
      b.kind === 'choice_selected' && b.stepId === stepId,
  )
}

export function dedupeToolTimelineBlocks(
  timeline: AgentTimelineBlock[],
): AgentTimelineBlock[] {
  const seenStepIds = new Set<string>()
  return timeline.filter((block) => {
    if (block.kind !== 'tool') {
      return true
    }
    if (seenStepIds.has(block.stepId)) {
      return false
    }
    seenStepIds.add(block.stepId)
    return true
  })
}

function timelineToolName(event: AgentEventEnvelope): string {
  if (typeof event.payload?.name === 'string') {
    return event.payload.name
  }
  if (typeof event.payload?.tool === 'string') {
    return event.payload.tool
  }
  return ''
}

function isHiddenTimelineTool(event: AgentEventEnvelope): boolean {
  const name = timelineToolName(event)
  return isHiddenTimelineToolName(name)
}

export function applyTimelineEvent(
  timeline: AgentTimelineBlock[],
  event: AgentEventEnvelope,
): AgentTimelineBlock[] {
  const type = event.type
  const stepId =
    typeof event.step_id === 'string' && event.step_id.trim()
      ? event.step_id.trim()
      : `seq-${event.sequence ?? timeline.length}`

  if (type === 'reasoning.started') {
    if (timeline.some((b) => b.kind === 'reasoning' && b.status === 'active')) {
      return timeline
    }
    return freezeTrailingStreamBlocks([
      ...timeline,
      {
        kind: 'reasoning',
        id: uniqueBlockId(timeline, 'reasoning', stepId),
        text: '',
        status: 'active',
      },
    ])
  }

  if (type === 'reasoning.delta') {
    const text = typeof event.payload.text === 'string' ? event.payload.text : ''
    return appendReasoningDelta(freezeTrailingStreamBlocks(timeline), text)
  }

  if (type === 'reasoning.completed') {
    return timeline.map((block) =>
      block.kind === 'reasoning' && block.status === 'active'
        ? { ...block, status: 'done' }
        : block,
    )
  }

  if (type === 'think.started') {
    if (timeline.some((b) => b.kind === 'think' && b.status === 'active')) {
      return timeline
    }
    return freezeTrailingStreamBlocks([
      ...timeline,
      {
        kind: 'think',
        id: uniqueBlockId(timeline, 'think', stepId),
        text: '',
        status: 'active',
      },
    ])
  }

  if (type === 'step.started') {
    const tool = typeof event.payload.tool === 'string' ? event.payload.tool : ''
    if (tool === 'think') {
      if (timeline.some((b) => b.kind === 'think' && b.status === 'active')) {
        return timeline
      }
      const lastThinkIdx = findLastIndex(timeline, (b) => b.kind === 'think')
      if (lastThinkIdx >= 0) {
        const block = timeline[lastThinkIdx]
        if (
          block.kind === 'think' &&
          block.status === 'done' &&
          canReopenThinkBlock(timeline, lastThinkIdx)
        ) {
          const next = [...timeline]
          next[lastThinkIdx] = { ...block, status: 'active' }
          return freezeTrailingStreamBlocks(next)
        }
      }
      return freezeTrailingStreamBlocks(appendActiveThinkBlock(timeline, '', stepId))
    }
    if (tool && !isHiddenTimelineToolName(tool)) {
      if (timeline.some((b) => b.kind === 'tool' && b.stepId === stepId)) {
        return timeline
      }
      return freezeTrailingStreamBlocks([
        ...timeline,
        {
          kind: 'tool',
          id: uniqueBlockId(timeline, 'tool', stepId),
          stepId,
        },
      ])
    }
    return timeline
  }

  if (type === 'think.delta') {
    const text = typeof event.payload.text === 'string' ? event.payload.text : ''
    return appendThinkDelta(freezeTrailingStreamBlocks(timeline), text, stepId)
  }

  if (type === 'think.completed') {
    return timeline.map((block) => {
      if (block.kind !== 'think' || block.status !== 'active') {
        return block
      }
      if (stepId && !thinkBlockMatchesStep(block, stepId)) {
        return block
      }
      return { ...block, status: 'done' as const }
    })
  }

  if (type === 'think.transition') {
    return timeline
  }

  if (
    type === 'crew.started' ||
    type === 'crew.stage.started' ||
    type === 'crew.stage.completed' ||
    type === 'crew.completed' ||
    type === 'crew.failed'
  ) {
    return timeline
  }

  if (
    type === 'skill.started' ||
    type === 'skill.loaded' ||
    type === 'skill.completed' ||
    type === 'skill.failed'
  ) {
    const payload =
      event.payload && typeof event.payload === 'object'
        ? (event.payload as Record<string, unknown>)
        : {}
    const { skillId, name } = parseSkillFromPayload(payload)
    const status: SkillTimelineStatus =
      type === 'skill.failed' ? 'failed' : type === 'skill.started' ? 'started' : 'loaded'
    return upsertSkillBlock(timeline, stepId, skillId, name, status)
  }

  if (type === 'planning.next_step') {
    const title =
      typeof event.payload.title === 'string' && event.payload.title
        ? event.payload.title
        : '执行中…'
    const lastTransitionIdx = findLastIndex(timeline, (b) => b.kind === 'transition')
    let next: AgentTimelineBlock[]
    if (lastTransitionIdx >= 0) {
      const block = timeline[lastTransitionIdx]
      if (block.kind === 'transition' && block.status !== 'done') {
        next = [...timeline]
        next[lastTransitionIdx] = { ...block, title, status: 'active' }
      } else {
        next = [
          ...timeline,
          {
            kind: 'transition',
            id: uniqueBlockId(timeline, 'transition', stepId),
            title,
            status: 'active' as const,
          },
        ]
      }
    } else {
      next = [
        ...timeline,
        {
          kind: 'transition',
          id: uniqueBlockId(timeline, 'transition', stepId),
          title,
          status: 'active' as const,
        },
      ]
    }
    return next
  }

  if (type === 'planning.invoking') {
    return timeline
  }

  if (type === 'planning.completed') {
    const planStepId =
      typeof event.step_id === 'string' && event.step_id.trim()
        ? event.step_id.trim()
        : ''
    const transitionId = planStepId ? `transition:${planStepId}` : ''
    let targetIdx = -1
    if (transitionId) {
      targetIdx = timeline.findIndex(
        (b) => b.kind === 'transition' && b.id === transitionId,
      )
    }
    if (targetIdx < 0) {
      targetIdx = findLastIndex(
        timeline,
        (b) => b.kind === 'transition' && (b.status === 'active' || !b.status),
      )
    }
    if (targetIdx < 0) {
      return timeline
    }
    const payload =
      event.payload && typeof event.payload === 'object'
        ? (event.payload as Record<string, unknown>)
        : {}
    const completedTitle =
      orchestrationCompletedTitle(payload) ??
      (typeof event.payload.title === 'string' && event.payload.title.trim()
        ? event.payload.title.trim()
        : undefined)
    const next = [...timeline]
    const block = timeline[targetIdx]
    if (block.kind === 'transition') {
      next[targetIdx] = {
        ...block,
        status: 'done' as const,
        title: completedTitle ?? block.title,
      }
    }
    return seedPlannedToolBlocks(next, payload, planStepId)
  }

  if (type === 'planning.failed') {
    const err =
      typeof event.payload.error === 'string' && event.payload.error
        ? event.payload.error
        : '规划失败'
    const failedTitle =
      typeof event.payload.title === 'string' && event.payload.title.trim()
        ? event.payload.title.trim()
        : err
    const lastTransitionIdx = findLastIndex(
      timeline,
      (b) => b.kind === 'transition' && (b.status === 'active' || !b.status),
    )
    if (lastTransitionIdx < 0) {
      return timeline
    }
    const next = [...timeline]
    const block = timeline[lastTransitionIdx]
    if (block.kind === 'transition') {
      next[lastTransitionIdx] = { ...block, title: failedTitle, status: 'done' as const }
    }
    return next
  }

  if (
    type === 'chapter.stream.started' ||
    type === 'chapter.stream.delta' ||
    type === 'chapter.stream.completed'
  ) {
    if (!timeline.some((b) => b.kind === 'tool' && b.stepId === stepId)) {
      return freezeTrailingStreamBlocks([
        ...timeline,
        {
          kind: 'tool',
          id: uniqueBlockId(timeline, 'tool', stepId),
          stepId,
        },
      ])
    }
    return timeline
  }

  if (type === 'tool.started') {
    if (isHiddenTimelineTool(event)) {
      return timeline
    }
    if (timeline.some((b) => b.kind === 'tool' && b.stepId === stepId)) {
      return timeline
    }
    return freezeTrailingStreamBlocks([
      ...timeline,
      {
        kind: 'tool',
        id: uniqueBlockId(timeline, 'tool', stepId),
        stepId,
      },
    ])
  }

  if (type === 'subagent.started') {
    const parentStepId =
      typeof event.payload.parent_step_id === 'string' && event.payload.parent_step_id.trim()
        ? event.payload.parent_step_id.trim()
        : stepId
    if (!timeline.some((b) => b.kind === 'tool' && b.stepId === parentStepId)) {
      return freezeTrailingStreamBlocks([
        ...timeline,
        {
          kind: 'tool',
          id: uniqueBlockId(timeline, 'tool', parentStepId),
          stepId: parentStepId,
        },
      ])
    }
    return timeline
  }

  if (type === 'tool.progress' || type === 'tool.completed' || type === 'tool.failed') {
    if (isHiddenTimelineTool(event)) {
      return timeline
    }
    if (!timeline.some((b) => b.kind === 'tool' && b.stepId === stepId)) {
      return freezeTrailingStreamBlocks([
        ...timeline,
        {
          kind: 'tool',
          id: uniqueBlockId(timeline, 'tool', stepId),
          stepId,
        },
      ])
    }
    return timeline
  }

  if (type === 'narration.delta') {
    const raw = typeof event.payload.text === 'string' ? event.payload.text : ''
    const text = sanitizeMessageDeltaChunk(raw)
    if (!text) {
      return timeline
    }
    return appendNarrationDelta(timeline, text)
  }

  if (type === 'narration.withdraw') {
    const lastNarrIdx = findLastIndex(
      timeline,
      (b) => b.kind === 'narration' && !b.frozen,
    )
    if (lastNarrIdx < 0) {
      return timeline
    }
    return timeline.filter((_, idx) => idx !== lastNarrIdx)
  }

  // message.started / message.delta / message.completed → messageSegment.ts（applyAgentEvent）

  return dedupeToolTimelineBlocks(timeline)
}

export function appendTimelineTextDelta(
  timeline: AgentTimelineBlock[],
  delta: string,
): AgentTimelineBlock[] {
  return appendTextDelta(timeline, delta)
}

export type ThinkBlockRenderContext = {
  streamLive?: boolean
  streamFinished?: boolean
}

/** 空占位 / 已完成且无正文的思考块不在 UI 展示（长文由 AgentThinkPanel 默认折叠为几行） */
export function shouldRenderThinkBlock(
  block: Extract<AgentTimelineBlock, { kind: 'think' }>,
  ctx: ThinkBlockRenderContext = {},
): boolean {
  if (block.text.trim()) {
    return true
  }
  if (block.id === 'think-pending') {
    return false
  }
  const { streamLive = false, streamFinished = true } = ctx
  return block.status === 'active' && streamLive && !streamFinished
}

export function pruneEmptyThinkBlocks(timeline: AgentTimelineBlock[]): AgentTimelineBlock[] {
  return timeline.filter((block) => {
    if (block.kind !== 'think') {
      return true
    }
    return shouldRenderThinkBlock(block)
  })
}

export function finalizeTimeline(timeline: AgentTimelineBlock[]): AgentTimelineBlock[] {
  return pruneEmptyThinkBlocks(
    normalizeTimelineBlockIds(
      timeline.map((block) => {
        if (block.kind === 'text' || block.kind === 'narration') {
          return { ...block, frozen: true }
        }
        if (block.kind === 'think' && block.status === 'active') {
          return { ...block, status: 'done' }
        }
        if (block.kind === 'reasoning' && block.status === 'active') {
          return { ...block, status: 'done' }
        }
        if (block.kind === 'transition' && block.status === 'active') {
          return { ...block, status: 'done' }
        }
        return block
      }),
    ),
  )
}

export function findStepState(
  stepStates: AgentStepState[],
  stepId: string,
): AgentStepState | undefined {
  return stepStates.find((s) => s.stepId === stepId)
}

export type ThinkRoundItem =
  | { kind: 'insight'; blocks: AgentTimelineBlock[] }
  | { kind: 'narration'; blocks: Extract<AgentTimelineBlock, { kind: 'narration' }>[] }
  | { kind: 'text'; blocks: Extract<AgentTimelineBlock, { kind: 'text' }>[] }
  | { kind: 'tools'; blocks: Extract<AgentTimelineBlock, { kind: 'tool' }>[] }

export type ThinkRoundPayload = {
  items: ThinkRoundItem[]
}

export function thinkRoundInsightBlocks(round: ThinkRoundPayload): AgentTimelineBlock[] {
  return round.items
    .filter((item): item is Extract<ThinkRoundItem, { kind: 'insight' }> => item.kind === 'insight')
    .flatMap((item) => item.blocks)
}

export function thinkRoundToolBlocks(
  round: ThinkRoundPayload,
): Extract<AgentTimelineBlock, { kind: 'tool' }>[] {
  return round.items
    .filter((item): item is Extract<ThinkRoundItem, { kind: 'tools' }> => item.kind === 'tools')
    .flatMap((item) => item.blocks)
}

export type TimelineRenderUnit =
  | { kind: 'segment'; blocks: AgentTimelineBlock[] }
  | {
      kind: 'think_round'
      items: ThinkRoundItem[]
    }
  | {
      kind: 'orchestration'
      id: string
      rounds: ThinkRoundPayload[]
      status: 'active' | 'done'
    }
  | {
      kind: 'planning'
      transition: Extract<AgentTimelineBlock, { kind: 'transition' }>
      blocks: AgentTimelineBlock[]
    }

/** 顶层展示分组：正文独立；连续思考/工具/编排合并为一条左侧灰线 */
export type TimelineDisplayGroup =
  | { kind: 'text'; id: string; blocks: Extract<AgentTimelineBlock, { kind: 'text' }>[] }
  | { kind: 'meta'; id: string; units: TimelineRenderUnit[] }

function isInsightBlock(block: AgentTimelineBlock): boolean {
  return block.kind === 'think' || block.kind === 'reasoning'
}

function isTextBlock(
  block: AgentTimelineBlock,
): block is Extract<AgentTimelineBlock, { kind: 'text' }> {
  return block.kind === 'text'
}

function isNarrationBlock(
  block: AgentTimelineBlock,
): block is Extract<AgentTimelineBlock, { kind: 'narration' }> {
  return block.kind === 'narration'
}

function pushThinkRoundItem(
  items: ThinkRoundItem[],
  item: ThinkRoundItem,
): void {
  const last = items[items.length - 1]
  if (last?.kind === item.kind) {
    const blocks = last.blocks as AgentTimelineBlock[]
    blocks.push(...item.blocks)
    return
  }
  items.push({ kind: item.kind, blocks: [...item.blocks] } as ThinkRoundItem)
}

/** 一轮内按时间线顺序保留：思考 / 编排正文 / 工具（交互工具单独 segment） */
export function groupBodyIntoThinkRounds(
  blocks: AgentTimelineBlock[],
  stepStates?: AgentStepState[],
): TimelineRenderUnit[] {
  const units: TimelineRenderUnit[] = []
  let items: ThinkRoundItem[] = []

  const flushRound = () => {
    if (items.length === 0) {
      return
    }
    units.push({ kind: 'think_round', items: [...items] })
    items = []
  }

  for (const block of blocks) {
    if (isInsightBlock(block)) {
      pushThinkRoundItem(items, { kind: 'insight', blocks: [block] })
      continue
    }
    if (isNarrationBlock(block)) {
      pushThinkRoundItem(items, { kind: 'narration', blocks: [block] })
      continue
    }
    if (isTextBlock(block)) {
      pushThinkRoundItem(items, { kind: 'text', blocks: [block] })
      continue
    }
    if (block.kind === 'tool') {
      if (isInteractionExposureBlock(block, stepStates)) {
        flushRound()
        units.push({ kind: 'segment', blocks: [block] })
        continue
      }
      pushThinkRoundItem(items, { kind: 'tools', blocks: [block] })
      continue
    }
    flushRound()
    units.push({ kind: 'segment', blocks: [block] })
  }
  flushRound()
  return units
}

export function planningTitleForToolName(toolName: string | undefined): string {
  return planningPrepTitle(toolName)
}

export function formatPlanningHeadline(
  transition: Extract<AgentTimelineBlock, { kind: 'transition' }>,
  streamLive: boolean,
  streamFinished: boolean,
): string {
  const raw = transition.title?.trim() ?? ''
  const generic = isPlanningGenericTitle(raw)
  const active =
    transition.status === 'active' && streamLive && !streamFinished
  if (active) {
    if (!raw || generic) {
      return '执行中…'
    }
    return raw
  }
  if (transition.status === 'done') {
    if (!raw || generic) {
      return '执行完成'
    }
    return raw
  }
  if (!raw || generic) {
    return '执行'
  }
  return raw
}

function headlineForStartedStep(step: AgentStepState): string | null {
  if (step.status !== 'started') {
    return null
  }
  const title = step.title?.trim()
  if (title && !isPlanningGenericTitle(title)) {
    return title.endsWith('…') ? title : `${title}…`
  }
  const tool = step.toolName ?? ''
  if (tool === 'ReadMemory' || tool === 'ReadChapter' || tool === 'SearchKnowledge' || tool === 'memory_read') {
    return planningActiveLabel(tool) ?? planningActiveLabel('Read') ?? i18n.t('editor:agent.orchestration.active.Read')
  }
  const activeLabel = tool ? planningActiveLabel(tool) : undefined
  if (activeLabel) {
    return activeLabel
  }
  return null
}

function deriveActiveToolHeadlineFromRounds(
  rounds: ThinkRoundPayload[],
  stepStates: AgentStepState[],
): string | null {
  for (let r = rounds.length - 1; r >= 0; r -= 1) {
    const round = rounds[r]
    if (!round) {
      continue
    }
    for (let i = round.items.length - 1; i >= 0; i -= 1) {
      const item = round.items[i]
      if (!item || item.kind !== 'tools') {
        continue
      }
      for (let b = item.blocks.length - 1; b >= 0; b -= 1) {
        const block = item.blocks[b]
        if (!block || block.kind !== 'tool') {
          continue
        }
        const step = findStepState(stepStates, block.stepId)
        if (!step) {
          continue
        }
        const headline = headlineForStartedStep(step)
        if (headline) {
          return headline
        }
      }
    }
  }
  return null
}

function hasActiveInsightBlock(rounds: ThinkRoundPayload[]): boolean {
  for (let r = rounds.length - 1; r >= 0; r -= 1) {
    const round = rounds[r]
    if (!round) {
      continue
    }
    for (let i = round.items.length - 1; i >= 0; i -= 1) {
      const item = round.items[i]
      if (!item || item.kind !== 'insight') {
        continue
      }
      for (let b = item.blocks.length - 1; b >= 0; b -= 1) {
        const block = item.blocks[b]
        if (!block) {
          continue
        }
        if (
          (block.kind === 'reasoning' || block.kind === 'think') &&
          block.status === 'active'
        ) {
          return true
        }
      }
    }
  }
  return false
}

/** 编排块标题：进行中时随当前步骤动态切换（思考 / 读记忆 / 写正文等） */
export function deriveActivePlanningHeadline(
  transition: Extract<AgentTimelineBlock, { kind: 'transition' }>,
  blocks: AgentTimelineBlock[],
  stepStates: AgentStepState[] | undefined,
  streamLive: boolean,
  streamFinished: boolean,
): string {
  const active =
    transition.status === 'active' && streamLive && !streamFinished
  if (!active) {
    return formatPlanningHeadline(transition, streamLive, streamFinished)
  }

  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i]
    if (block.kind === 'tool' && stepStates) {
      const step = findStepState(stepStates, block.stepId)
      if (step) {
        const headline = headlineForStartedStep(step)
        if (headline) {
          return headline
        }
      }
    }
  }

  const insight = mergePlanningInsightBlocks(blocks)
  if (insight.isActive) {
    return '思考中…'
  }

  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i]
    if (block.kind === 'reasoning' && block.status === 'active') {
      return '思考中…'
    }
  }

  return formatPlanningHeadline(transition, streamLive, streamFinished)
}

function segmentShouldWrapAsPlanning(
  _blocks: AgentTimelineBlock[],
  _stepStates?: AgentStepState[],
): boolean {
  return false
}

/** 回复正文块 id：优先 SSE delivery 标记，旧时间线 fallback 到最后一个 tool 之后 */
export function collectTrailingDeliveryBlockIds(
  timeline: AgentTimelineBlock[],
): Set<string> {
  if (timelineHasExplicitDelivery(timeline)) {
    return collectDeliveryBlockIds(timeline)
  }
  if (timeline.length === 0) {
    return new Set()
  }
  const ids = new Set<string>()
  const lastToolIdx = findLastIndex(timeline, (b) => b.kind === 'tool')
  if (lastToolIdx < 0) {
    for (const block of timeline) {
      if (
        (block.kind === 'text' || block.kind === 'narration') &&
        block.content.trim() &&
        !isToolErrorLikeText(block.content)
      ) {
        ids.add(block.id)
      }
    }
    return ids
  }
  for (let idx = lastToolIdx + 1; idx < timeline.length; idx += 1) {
    const block = timeline[idx]
    if (block.kind === 'text' || block.kind === 'narration') {
      if (block.content.trim() && !isToolErrorLikeText(block.content)) {
        ids.add(block.id)
      }
      continue
    }
    break
  }
  return ids
}

export function extractTrailingDeliveryProseFromTimeline(
  timeline: AgentTimelineBlock[],
): string {
  const ids = collectTrailingDeliveryBlockIds(timeline)
  if (ids.size === 0) {
    return ''
  }
  return timeline
    .filter(
      (block): block is Extract<AgentTimelineBlock, { kind: 'text' | 'narration' }> =>
        (block.kind === 'text' || block.kind === 'narration') && ids.has(block.id),
    )
    .map((block) => block.content)
    .join('')
    .trim()
}

/** 流结束后：全时间线最后一个工具之后的正文留在编排层外，不被折叠 */
function collectGlobalDeliveryBlockIds(
  timeline: AgentTimelineBlock[],
  streamFinished?: boolean,
): Set<string> {
  if (timelineHasExplicitDelivery(timeline)) {
    return collectDeliveryBlockIds(timeline)
  }
  if (!streamFinished) {
    return new Set()
  }
  return collectTrailingDeliveryBlockIds(timeline)
}

function stripDeliveryBlocksFromThinkRoundItems(
  items: ThinkRoundItem[],
  deliveryIds: Set<string>,
): ThinkRoundItem[] {
  const out: ThinkRoundItem[] = []
  for (const item of items) {
    if (item.kind !== 'narration' && item.kind !== 'text') {
      out.push(item)
      continue
    }
    const kept = item.blocks.filter((block) => !deliveryIds.has(block.id))
    if (kept.length > 0) {
      pushThinkRoundItem(out, { kind: item.kind, blocks: kept } as ThinkRoundItem)
    }
  }
  return out
}

function stripDeliveryBlocksFromUnits(
  units: TimelineRenderUnit[],
  deliveryIds: Set<string>,
): TimelineRenderUnit[] {
  const out: TimelineRenderUnit[] = []
  for (const unit of units) {
    if (unit.kind === 'orchestration') {
      const rounds = unit.rounds
        .map((round) => ({
          items: stripDeliveryBlocksFromThinkRoundItems(round.items, deliveryIds),
        }))
        .filter((round) => round.items.length > 0)
      if (rounds.length > 0) {
        out.push({ ...unit, rounds })
      }
      continue
    }
    if (unit.kind === 'think_round') {
      const items = stripDeliveryBlocksFromThinkRoundItems(unit.items, deliveryIds)
      if (items.length > 0) {
        out.push({ kind: 'think_round', items })
      }
      continue
    }
    if (unit.kind === 'segment') {
      const blocks = unit.blocks.filter((block) => !deliveryIds.has(block.id))
      if (blocks.length > 0) {
        out.push({ kind: 'segment', blocks })
      }
      continue
    }
    if (unit.kind === 'planning') {
      const blocks = unit.blocks.filter((block) => !deliveryIds.has(block.id))
      if (blocks.length > 0) {
        out.push({ ...unit, blocks })
      }
      continue
    }
    out.push(unit)
  }
  return out
}

function promoteGlobalTrailingDelivery(
  units: TimelineRenderUnit[],
  timeline: AgentTimelineBlock[],
  streamFinished?: boolean,
): TimelineRenderUnit[] {
  const deliveryIds = collectGlobalDeliveryBlockIds(timeline, streamFinished)
  if (deliveryIds.size === 0) {
    return units
  }
  const deliveryBlocks = timeline.filter((block) => deliveryIds.has(block.id))
  const stripped = stripDeliveryBlocksFromUnits(units, deliveryIds)
  return [...stripped, { kind: 'segment', blocks: deliveryBlocks }]
}

/** 待用户点选/填写的工具块应放在编排外，与正文同级 */
function isInteractionExposureBlock(
  block: AgentTimelineBlock,
  stepStates?: AgentStepState[],
): boolean {
  if (block.kind !== 'tool') {
    return false
  }
  if (!stepStates?.length) {
    return false
  }
  const step = findStepState(stepStates, block.stepId)
  if (!step || step.type !== 'tool') {
    return stepStates.some(
      (s) =>
        s.stepId === block.stepId &&
        (isAskUserTool(s.toolName) || s.interaction?.type === 'ask_user'),
    )
  }

  // AskUser / choose 始终露出到编排层外，避免编排折叠后看不到表单
  if (isAskUserTool(step.toolName)) {
    return true
  }

  const interaction = step.interaction
  if (interaction?.type === 'ask_user') {
    return Boolean(
      interaction.questions?.length ||
        interaction.options?.length ||
        step.choices?.length,
    )
  }
  if (interaction?.type === 'user_input') {
    return true
  }
  if (
    interaction?.type === 'single_select' ||
    interaction?.type === 'multi_select'
  ) {
    return Boolean(step.choices?.length || interaction.options?.length)
  }
  if (Boolean(step.choices?.length) && step.status === 'completed') {
    return true
  }
  return false
}

/** 编排层结束后的顶层块：问答（编排正文留在编排区内；待办在消息顶栏） */
export function isSiblingExposureBlock(
  block: AgentTimelineBlock,
  stepStates?: AgentStepState[],
): boolean {
  return isInteractionExposureBlock(block, stepStates)
}

function splitSiblingExposureSuffix(
  blocks: AgentTimelineBlock[],
  stepStates?: AgentStepState[],
): {
  prefix: AgentTimelineBlock[]
  exposureSuffix: AgentTimelineBlock[]
} {
  const firstIdx = blocks.findIndex((block) =>
    isSiblingExposureBlock(block, stepStates),
  )
  if (firstIdx < 0) {
    return { prefix: blocks, exposureSuffix: [] }
  }
  return {
    prefix: blocks.slice(0, firstIdx),
    exposureSuffix: blocks.slice(firstIdx),
  }
}

function isOrchestrationTerminalUnit(
  unit: TimelineRenderUnit,
  stepStates?: AgentStepState[],
): boolean {
  if (unit.kind !== 'segment') {
    return false
  }
  return unit.blocks.some((block) => isSiblingExposureBlock(block, stepStates))
}

function isOrchestrationClosingUnit(
  unit: TimelineRenderUnit,
  stepStates?: AgentStepState[],
  streamFinished?: boolean,
): boolean {
  if (isOrchestrationTerminalUnit(unit, stepStates)) {
    return true
  }
  if (!streamFinished || unit.kind !== 'segment') {
    return false
  }
  return (
    unit.blocks.length > 0 &&
    unit.blocks.every((block) => block.kind === 'text' || block.kind === 'narration')
  )
}

/** 连续 think_round 合并为可折叠编排层；遇正文/问答/待办则标记完成 */
export function coalesceOrchestrationUnits(
  units: TimelineRenderUnit[],
  stepStates?: AgentStepState[],
  streamFinished?: boolean,
): TimelineRenderUnit[] {
  const out: TimelineRenderUnit[] = []
  let rounds: ThinkRoundPayload[] = []

  const flush = (done: boolean) => {
    if (rounds.length === 0) {
      return
    }
    out.push({
      kind: 'orchestration',
      id: `orch:${out.length}`,
      rounds: [...rounds],
      status: done ? 'done' : 'active',
    })
    rounds = []
  }

  for (const unit of units) {
    if (unit.kind === 'think_round') {
      rounds.push({ items: unit.items })
      continue
    }
    flush(isOrchestrationClosingUnit(unit, stepStates, streamFinished))
    out.push(unit)
  }
  flush(Boolean(streamFinished))
  return out
}

export function deriveOrchestrationHeadline(
  rounds: ThinkRoundPayload[],
  stepStates: AgentStepState[],
  streamLive: boolean,
  streamFinished: boolean,
  status: 'active' | 'done',
  completedOverview?: string,
): string {
  const streaming = streamLive && !streamFinished
  const toolsStillRunning = stepStates.some(
    (step) => step.type === 'tool' && step.status === 'started',
  )
  if (!streaming) {
    if (status === 'done' && !toolsStillRunning) {
      const overview = completedOverview?.trim()
      if (overview && !isPlanningGenericTitle(overview)) {
        return `执行完成 · ${overview}`
      }
      return '执行完成'
    }
    return '执行'
  }

  const toolHeadline = deriveActiveToolHeadlineFromRounds(rounds, stepStates)
  if (toolHeadline) {
    return toolHeadline
  }

  if (hasActiveInsightBlock(rounds)) {
    return '思考中…'
  }

  if (status === 'done') {
    return '成稿中…'
  }

  return '执行中…'
}

function findLastAnsweredInteractionToolIndex(
  timeline: AgentTimelineBlock[],
  stepStates: AgentStepState[],
): number {
  let lastIdx = -1
  for (let i = 0; i < timeline.length; i += 1) {
    const block = timeline[i]
    if (block.kind !== 'tool') {
      continue
    }
    if (!isSiblingExposureBlock(block, stepStates)) {
      continue
    }
    if (!findChoiceSelectedForStep(timeline, block.stepId)) {
      continue
    }
    lastIdx = i
  }
  return lastIdx
}

function hasPostInteractionOrchestrationBlocks(
  timeline: AgentTimelineBlock[],
  afterToolIdx: number,
): boolean {
  for (let i = afterToolIdx + 1; i < timeline.length; i += 1) {
    const block = timeline[i]
    if (block.kind === 'choice_selected') {
      continue
    }
    if (
      block.kind === 'think' ||
      block.kind === 'reasoning' ||
      block.kind === 'narration' ||
      block.kind === 'tool' ||
      (block.kind === 'text' && block.content.trim())
    ) {
      return true
    }
  }
  return false
}

/** 交互已回答、SSE 尚未推来新编排块时，展示「编排中…」占位，避免空档 */
export function shouldShowOrchestrationResumeGap(options: {
  timelineUnits: TimelineRenderUnit[]
  timeline: AgentTimelineBlock[]
  stepStates: AgentStepState[]
  streamLive: boolean
  streamFinished: boolean
  awaitingInteraction: boolean
}): boolean {
  const {
    timelineUnits,
    timeline,
    stepStates,
    streamLive,
    streamFinished,
    awaitingInteraction,
  } = options

  if (!streamLive || streamFinished || awaitingInteraction) {
    return false
  }

  if (
    timelineUnits.some(
      (unit) => unit.kind === 'orchestration' && unit.status === 'active',
    )
  ) {
    return false
  }

  if (
    stepStates.some(
      (s) =>
        (isAskUserTool(s.toolName) || s.interaction?.type === 'ask_user') &&
        Boolean(s.interaction?.questions?.length) &&
        s.status === 'completed' &&
        !findChoiceSelectedForStep(timeline, s.stepId),
    )
  ) {
    return false
  }

  const hasDoneOrchestration = timelineUnits.some(
    (unit) => unit.kind === 'orchestration' && unit.status === 'done',
  )
  if (!hasDoneOrchestration) {
    return false
  }

  const lastAnsweredIdx = findLastAnsweredInteractionToolIndex(timeline, stepStates)
  if (lastAnsweredIdx < 0) {
    return false
  }

  return !hasPostInteractionOrchestrationBlocks(timeline, lastAnsweredIdx)
}

function pushSegmentUnits(
  units: TimelineRenderUnit[],
  blocks: AgentTimelineBlock[],
  stepStates?: AgentStepState[],
): void {
  if (blocks.length === 0) {
    return
  }
  const { prefix, exposureSuffix } = splitSiblingExposureSuffix(blocks, stepStates)
  pushInterleavedMetaAndTextUnits(units, prefix, stepStates)
  if (exposureSuffix.length === 0) {
    return
  }
  // AskUser / 选项交互需保持顶层 segment，便于渲染表单。
  if (exposureSuffix.every((block) => isSiblingExposureBlock(block, stepStates))) {
    units.push({ kind: 'segment', blocks: exposureSuffix })
    return
  }
  pushInterleavedMetaAndTextUnits(units, exposureSuffix, stepStates)
}

/** 正文与思考/工具同段时一并归入 think_round，不再拆成顶层 segment */
function pushInterleavedMetaAndTextUnits(
  units: TimelineRenderUnit[],
  blocks: AgentTimelineBlock[],
  stepStates?: AgentStepState[],
): void {
  if (blocks.length === 0) {
    return
  }
  units.push(...groupBodyIntoThinkRounds(blocks, stepStates))
}

/** 展示前拆分 mixed segment（兼容旧时间线：工具/思考与正文交错） */
export function flattenTimelineUnitsForDisplay(
  units: TimelineRenderUnit[],
): TimelineRenderUnit[] {
  const flat: TimelineRenderUnit[] = []
  for (const unit of units) {
    if (unit.kind !== 'segment') {
      flat.push(unit)
      continue
    }
    let index = 0
    while (index < unit.blocks.length) {
      const block = unit.blocks[index]
      if (block.kind === 'text') {
        const textRun: AgentTimelineBlock[] = []
        while (index < unit.blocks.length && unit.blocks[index].kind === 'text') {
          textRun.push(unit.blocks[index])
          index += 1
        }
        flat.push({ kind: 'segment', blocks: textRun })
        continue
      }
      const metaRun: AgentTimelineBlock[] = []
      while (index < unit.blocks.length && unit.blocks[index].kind !== 'text') {
        metaRun.push(unit.blocks[index])
        index += 1
      }
      if (metaRun.length > 0) {
        flat.push(...groupBodyIntoThinkRounds(metaRun))
      }
    }
  }
  return flat
}

function isTextOnlySegmentUnit(
  unit: TimelineRenderUnit,
): unit is { kind: 'segment'; blocks: AgentTimelineBlock[] } {
  return (
    unit.kind === 'segment' &&
    unit.blocks.length > 0 &&
    unit.blocks.every((block) => block.kind === 'text')
  )
}

export function groupTimelineDisplayGroups(
  units: TimelineRenderUnit[],
): TimelineDisplayGroup[] {
  const normalized = flattenTimelineUnitsForDisplay(units)
  const groups: TimelineDisplayGroup[] = []
  let metaBuffer: TimelineRenderUnit[] = []

  const flushMeta = () => {
    if (metaBuffer.length === 0) {
      return
    }
    groups.push({
      kind: 'meta',
      id: `meta:${groups.length}`,
      units: [...metaBuffer],
    })
    metaBuffer = []
  }

  for (const unit of normalized) {
    if (isTextOnlySegmentUnit(unit)) {
      flushMeta()
      groups.push({
        kind: 'text',
        id: `text:${groups.length}`,
        blocks: unit.blocks.filter(
          (block): block is Extract<AgentTimelineBlock, { kind: 'text' }> =>
            block.kind === 'text',
        ),
      })
      continue
    }
    metaBuffer.push(unit)
  }
  flushMeta()
  return groups
}

function buildSyntheticExecutionTransition(
  blocks: AgentTimelineBlock[],
  stepStates?: AgentStepState[],
): Extract<AgentTimelineBlock, { kind: 'transition' }> {
  const toolBlock = blocks.find(
    (b): b is Extract<AgentTimelineBlock, { kind: 'tool' }> => b.kind === 'tool',
  )
  let title = '后续步骤'
  if (toolBlock && stepStates) {
    const step = findStepState(stepStates, toolBlock.stepId)
    if (step?.title?.trim() && !isPlanningGenericTitle(step.title.trim())) {
      title = step.title.trim()
    } else if (step?.toolName && !isHiddenUiTool(step.toolName)) {
      title = planningTitleForToolName(step.toolName)
    }
  }
  const toolActive =
    toolBlock &&
    stepStates &&
    findStepState(stepStates, toolBlock.stepId)?.status === 'started'
  const insightActive = blocks.some(
    (b) => b.kind === 'reasoning' && b.status === 'active',
  )
  return {
    kind: 'transition',
    id: `synth-exec:${toolBlock?.stepId ?? blocks[0]?.id ?? 'segment'}`,
    title,
    status: toolActive || insightActive ? 'active' : 'done',
  }
}

/** 编排推理末尾面向用户的行动说明（非内省推理） */
const PLANNING_ACTION_NARRATION_RE =
  /^(?:让我|我先|接下来|现在|然后|我将|我会|首先|最后)/u

/** 将 reasoning 正文与末尾行动说明拆开，行动说明应展示在思考与工具之间 */
export function splitPlanningReasoningTailNarration(text: string): {
  insight: string
  narration: string
} {
  const trimmed = text.trim()
  if (!trimmed) {
    return { insight: '', narration: '' }
  }

  const paragraphs = trimmed.split(/\n\n+/).map((part) => part.trim()).filter(Boolean)
  if (paragraphs.length <= 1) {
    const only = paragraphs[0] ?? ''
    if (only.length <= 160 && PLANNING_ACTION_NARRATION_RE.test(only)) {
      return { insight: '', narration: only }
    }
    return { insight: trimmed, narration: '' }
  }

  const last = paragraphs[paragraphs.length - 1] ?? ''
  const looksLikeAction =
    last.length <= 200 &&
    PLANNING_ACTION_NARRATION_RE.test(last) &&
    !/^\d+\./.test(last) &&
    last.split('\n').length <= 2

  if (!looksLikeAction) {
    return { insight: trimmed, narration: '' }
  }

  return {
    insight: paragraphs.slice(0, -1).join('\n\n').trim(),
    narration: last,
  }
}

/** 合并编排单元内的 think / reasoning（CC 编排洞察区） */
export function mergePlanningInsightBlocks(blocks: AgentTimelineBlock[]): {
  text: string
  isActive: boolean
} {
  const parts: string[] = []
  let isActive = false
  for (const block of blocks) {
    if (block.kind === 'think') {
      const trimmed = block.text.trim()
      if (trimmed) {
        parts.push(trimmed)
        if (block.status === 'active') {
          isActive = true
        }
      }
      continue
    }
    if (block.kind !== 'reasoning') {
      continue
    }
    const trimmed = block.text.trim()
    if (trimmed && !isPlanReasoningPlaceholder(trimmed)) {
      parts.push(trimmed)
    }
    if (block.status === 'active') {
      isActive = true
    }
  }
  return { text: sanitizeThinkText(parts.join('\n\n')), isActive }
}

function isPlanningReasoningBlock(block: AgentTimelineBlock): boolean {
  return block.kind === 'reasoning'
}

/** 规划单元前紧邻的 reasoning 收进编排块（think 工具块始终留在顶层 segment） */
function absorbLeadingReasoningIntoPlanning(units: TimelineRenderUnit[]): TimelineRenderUnit[] {
  const out: TimelineRenderUnit[] = []
  for (const unit of units) {
    if (unit.kind !== 'planning') {
      out.push(unit)
      continue
    }
    const prev = out[out.length - 1]
    if (prev?.kind === 'segment') {
      let reasoningEnd = 0
      while (
        reasoningEnd < prev.blocks.length &&
        isPlanningReasoningBlock(prev.blocks[reasoningEnd])
      ) {
        reasoningEnd += 1
      }
      if (reasoningEnd > 0) {
        const reasoning = prev.blocks.slice(0, reasoningEnd).map((block) => ({ ...block }))
        out.push({
          kind: 'planning',
          transition: unit.transition,
          blocks: [...reasoning, ...unit.blocks],
        })
        continue
      }
    }
    out.push(unit)
  }
  return out
}

/** 将扁平 timeline 按「规划中」transition 切成顶层段落与规划子树 */
export function groupTimelineUnits(
  timeline: AgentTimelineBlock[],
  stepStates?: AgentStepState[],
  options?: { streamFinished?: boolean },
): TimelineRenderUnit[] {
  const units: TimelineRenderUnit[] = []
  let i = 0
  while (i < timeline.length) {
    const block = timeline[i]
    if (block.kind === 'transition') {
      const children: AgentTimelineBlock[] = []
      i += 1
      while (i < timeline.length && timeline[i].kind !== 'transition') {
        if (isSiblingExposureBlock(timeline[i], stepStates)) {
          break
        }
        children.push(timeline[i])
        i += 1
      }
      if (children.length > 0) {
        units.push(...groupBodyIntoThinkRounds(children, stepStates))
      }
      continue
    }
    const segment: AgentTimelineBlock[] = []
    while (i < timeline.length && timeline[i].kind !== 'transition') {
      segment.push(timeline[i])
      i += 1
    }
    if (segment.length > 0) {
      pushSegmentUnits(units, segment, stepStates)
    }
  }
  const wrapped = units.flatMap((unit) => {
    if (unit.kind !== 'segment' || !segmentShouldWrapAsPlanning(unit.blocks, stepStates)) {
      return [unit]
    }
    return [
      {
        kind: 'planning' as const,
        transition: buildSyntheticExecutionTransition(unit.blocks, stepStates),
        blocks: unit.blocks,
      },
    ]
  })
  return promoteGlobalTrailingDelivery(
    coalesceOrchestrationUnits(
      finalizeOrchestrationBeforeInteraction(
        absorbLeadingReasoningIntoPlanning(wrapped).flatMap((unit) =>
          promoteInteractionExposureFromUnit(unit, stepStates),
        ),
        stepStates,
      ),
      stepStates,
      options?.streamFinished,
    ),
    timeline,
    options?.streamFinished,
  )
}

/** 询问/选项 segment 之前的编排层一律视为已完成，避免仍显示「编排」 */
function finalizeOrchestrationBeforeInteraction(
  units: TimelineRenderUnit[],
  stepStates?: AgentStepState[],
): TimelineRenderUnit[] {
  const firstInteractionIdx = units.findIndex(
    (unit) =>
      unit.kind === 'segment' &&
      unit.blocks.some((block) => isSiblingExposureBlock(block, stepStates)),
  )
  if (firstInteractionIdx < 0) {
    return units
  }
  return units.map((unit, index) => {
    if (unit.kind !== 'orchestration' || index >= firstInteractionIdx) {
      return unit
    }
    if (unit.status === 'done') {
      return unit
    }
    return { ...unit, status: 'done' as const }
  })
}

function promoteInteractionExposureFromUnit(
  unit: TimelineRenderUnit,
  stepStates?: AgentStepState[],
): TimelineRenderUnit[] {
  if (unit.kind === 'orchestration') {
    const promoted: Extract<AgentTimelineBlock, { kind: 'tool' }>[] = []
    const rounds: ThinkRoundPayload[] = []
    for (const round of unit.rounds) {
      const items: ThinkRoundItem[] = []
      for (const item of round.items) {
        if (item.kind !== 'tools') {
          items.push(item)
          continue
        }
        const kept: Extract<AgentTimelineBlock, { kind: 'tool' }>[] = []
        for (const block of item.blocks) {
          if (isInteractionExposureBlock(block, stepStates)) {
            promoted.push(block)
          } else {
            kept.push(block)
          }
        }
        if (kept.length > 0) {
          items.push({ kind: 'tools', blocks: kept })
        }
      }
      if (items.length > 0) {
        rounds.push({ items })
      }
    }
    const out: TimelineRenderUnit[] = []
    if (rounds.length > 0) {
      out.push({ ...unit, rounds })
    }
    for (const block of promoted) {
      out.push({ kind: 'segment', blocks: [block] })
    }
    return out.length > 0 ? out : [unit]
  }
  if (unit.kind === 'think_round') {
    const promoted: Extract<AgentTimelineBlock, { kind: 'tool' }>[] = []
    const items: ThinkRoundItem[] = []
    for (const item of unit.items) {
      if (item.kind !== 'tools') {
        items.push(item)
        continue
      }
      const kept: Extract<AgentTimelineBlock, { kind: 'tool' }>[] = []
      for (const block of item.blocks) {
        if (isInteractionExposureBlock(block, stepStates)) {
          promoted.push(block)
        } else {
          kept.push(block)
        }
      }
      if (kept.length > 0) {
        items.push({ kind: 'tools', blocks: kept })
      }
    }
    const out: TimelineRenderUnit[] = []
    if (items.length > 0) {
      out.push({ ...unit, items })
    }
    for (const block of promoted) {
      out.push({ kind: 'segment', blocks: [block] })
    }
    return out.length > 0 ? out : [unit]
  }
  return [unit]
}
