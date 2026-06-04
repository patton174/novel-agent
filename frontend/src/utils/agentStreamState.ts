import type {
  AgentChoiceOption,
  AgentContextUsage,
  AgentEventEnvelope,
  AgentInteractionPayload,
  AgentStepState,
  AgentStreamUiState,
  AgentTimelineBlock,
  AgentTodoItem,
  AgentTodoStatus,
  AskUserQuestion,
} from '../types/agent'
import { chapterWriteProgressLabel, toolDisplayName } from './agentLabels'
import {
  formatToolInputFromPayload,
  toolOutputFromPayload,
} from './toolDetailFormat'
import { isHiddenUiTool } from './agentHiddenTools'
import { isAskUserTool, normalizeToolName, vfsPathFromPayload } from './agentToolNames'
import { ccToolHumanSubtitle, ccToolHumanSubtitleFromPayload } from './ccToolDisplay'
import {
  applyTimelineEvent,
  appendChoiceSelected,
  appendTimelineTextDelta,
  finalizeTimeline,
  normalizeTimelineBlockIds,
} from './agentStreamTimeline'
import { applySubagentStepEvent } from './subagentStream'
import {
  hasChoiceMarkers,
  messageIntroBeforeChoices,
  sanitizeThinkText,
  stripChoiceBlocksFromMessage,
  appendMessageDeltaContent,
  sanitizeAssistantMessage,
  sanitizeMessageDeltaChunk,
} from './sanitizeAgentText'

const TODO_STATUSES = new Set<AgentTodoStatus>([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
])

function parseTodoStatus(raw: unknown): AgentTodoStatus {
  const s = String(raw ?? 'pending')
  return TODO_STATUSES.has(s as AgentTodoStatus) ? (s as AgentTodoStatus) : 'pending'
}

function parseTodoList(raw: unknown): AgentTodoItem[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined
  }
  const items = raw
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null
      }
      const cell = row as Record<string, unknown>
      const id = String(cell.id ?? '').trim()
      const content = String(
        cell.content ?? cell.title ?? cell.task ?? cell.description ?? cell.name ?? '',
      ).trim()
      if (!id || !content) {
        return null
      }
      return {
        id,
        content,
        status: parseTodoStatus(cell.status),
      }
    })
    .filter((item): item is AgentTodoItem => item !== null)
  return items.length ? items : undefined
}

function todosFromPayload(event: AgentEventEnvelope): AgentTodoItem[] | undefined {
  const direct = parseTodoList(event.payload.todos)
  if (direct) {
    return direct
  }
  const patch = event.payload.context_patch
  if (patch && typeof patch === 'object') {
    return parseTodoList((patch as Record<string, unknown>).todos)
  }
  return undefined
}

function mergeTodoLists(
  existing: AgentTodoItem[] | undefined,
  incoming: AgentTodoItem[] | undefined,
): AgentTodoItem[] | undefined {
  if (!incoming?.length) {
    return existing
  }
  const byId = new Map<string, AgentTodoItem>()
  for (const item of existing ?? []) {
    byId.set(item.id, item)
  }
  for (const item of incoming) {
    byId.set(item.id, item)
  }
  return [...byId.values()]
}

export { stepStatusLabel } from './agentLabels'

export function createInitialAgentStreamUiState(): AgentStreamUiState {
  return {
    thinkText: '',
    stepStates: [],
    activeToolCount: 0,
    messageContent: '',
    isStreamEnded: false,
    runTerminalAck: false,
    isThinking: false,
    streamError: undefined,
    hostGuardMessage: undefined,
    stripChoiceBlockFromMessage: false,
    timeline: [],
    seenSequences: [],
    awaitingInteraction: false,
    streamPaused: false,
  }
}

function isDuplicateEvent(state: AgentStreamUiState, event: AgentEventEnvelope): boolean {
  if (typeof event.sequence !== 'number') {
    return false
  }
  return (state.seenSequences ?? []).includes(event.sequence)
}

const MAX_SEEN_SEQUENCES = 512

function markEventSeen(state: AgentStreamUiState, event: AgentEventEnvelope): AgentStreamUiState {
  if (typeof event.sequence !== 'number') {
    return state
  }
  const seen = state.seenSequences ?? []
  if (seen.includes(event.sequence)) {
    return state
  }
  const next = [...seen, event.sequence]
  return {
    ...state,
    seenSequences:
      next.length > MAX_SEEN_SEQUENCES ? next.slice(-MAX_SEEN_SEQUENCES) : next,
  }
}

function stepStatusFromEventType(
  eventType: string,
  payload?: Record<string, unknown>,
): AgentStepState['status'] {
  if (eventType.endsWith('.failed')) {
    return 'failed'
  }
  if (eventType.endsWith('.completed')) {
    if (payload?.status === 'error') {
      return 'failed'
    }
    return 'completed'
  }
  return 'started'
}

function toolTitle(event: AgentEventEnvelope): string {
  const payload = event.payload
  if (typeof payload.display_name === 'string' && payload.display_name) {
    return payload.display_name
  }
  const name = typeof payload.name === 'string' ? payload.name : ''
  return name ? toolDisplayName(name) : '工具'
}

function contextThresholdsFromPayload(
  raw: unknown,
): AgentContextUsage['thresholds'] | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const t = raw as Record<string, unknown>
  return {
    contextLimit: Number(t.context_limit) || 200_000,
    compressThresholdTokens: Number(t.compress_threshold_tokens) || 0,
    warningThresholdTokens: Number(t.warning_threshold_tokens) || 0,
  }
}

function contextUsageFromPayload(payload: Record<string, unknown>): AgentContextUsage {
  const sectionsRaw = payload.sections
  const sections =
    sectionsRaw && typeof sectionsRaw === 'object' && !Array.isArray(sectionsRaw)
      ? Object.fromEntries(
          Object.entries(sectionsRaw as Record<string, unknown>).map(([k, v]) => [
            k,
            typeof v === 'number' ? v : Number(v) || 0,
          ]),
        )
      : undefined
  const sourceRaw = payload.source
  const source =
    typeof sourceRaw === 'string' && sourceRaw ? sourceRaw : undefined
  const lastCompactMode =
    typeof payload.last_compact_mode === 'string' && payload.last_compact_mode
      ? payload.last_compact_mode
      : undefined
  return {
    turn: typeof payload.turn === 'number' ? payload.turn : 0,
    promptTokens: Number(payload.prompt_tokens) || 0,
    contextLimit: Number(payload.context_limit) || 200_000,
    contextPercent: Number(payload.context_percent) || 0,
    percentLeft:
      payload.percent_left != null ? Number(payload.percent_left) : undefined,
    runInputTokens: Number(payload.run_input_tokens) || 0,
    runOutputTokens: Number(payload.run_output_tokens) || 0,
    cacheReadTokens: Number(payload.cache_read_tokens) || 0,
    cacheCreationTokens: Number(payload.cache_creation_tokens) || 0,
    compressed: payload.compressed === true,
    compactNote:
      typeof payload.compact_note === 'string' && payload.compact_note
        ? payload.compact_note
        : undefined,
    sections,
    source,
    thresholds: contextThresholdsFromPayload(payload.thresholds),
    lastCompactMode,
  }
}

function outputSummaryFromPayload(event: AgentEventEnvelope): string | undefined {
  const payload = event.payload
  const toolName = typeof payload.name === 'string' ? payload.name : ''
  const labels = wireResultLabels(event)
  if (typeof payload.output_summary === 'string' && payload.output_summary.trim()) {
    return payload.output_summary.trim()
  }
  if (labels?.length) {
    return undefined
  }
  if (typeof payload.display_excerpt === 'string' && payload.display_excerpt.trim()) {
    return payload.display_excerpt.trim()
  }
  if (typeof payload.action_label === 'string' && payload.action_label) {
    return payload.action_label
  }
  if (typeof payload.output === 'string' && payload.output.trim()) {
    const text = payload.output.trim()
    const canonical = normalizeToolName(toolName)
    const compactOnly =
      canonical === 'Read' ||
      canonical === 'Grep' ||
      canonical === 'Glob' ||
      toolName.startsWith('memory_') ||
      toolName.startsWith('chapter_')
    if (compactOnly && text.length > 200) {
      return `${text.slice(0, 120)}…`
    }
    if (canonical === 'Write' || canonical === 'Edit') {
      return undefined
    }
    return text
  }
  if (typeof payload.error === 'string' && payload.error) {
    return payload.error
  }
  return undefined
}

function wireResultLabels(event: AgentEventEnvelope): string[] | undefined {
  const raw = event.payload.result_labels
  if (!Array.isArray(raw) || raw.length === 0) {
    const toolName =
      typeof event.payload.name === 'string' ? event.payload.name : ''
    const canonical = normalizeToolName(toolName)
    if (canonical === 'Write' || canonical === 'Edit' || canonical === 'Delete') {
      return undefined
    }
    const action = event.payload.action_label
    return typeof action === 'string' && action.trim() ? [action.trim()] : undefined
  }
  const labels = raw.map((label) => String(label).trim()).filter(Boolean)
  return labels.length ? labels : undefined
}

function choicesFromPayload(event: AgentEventEnvelope): AgentChoiceOption[] | undefined {
  const raw = event.payload.choices
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((item, index) => {
        const row = item as unknown as Record<string, unknown>
        return {
          id: String(row.id ?? `opt-${index + 1}`),
          title: String(row.title ?? ''),
          description: String(row.description ?? ''),
        }
      })
      .filter((c) => c.title)
  }
  const interaction = event.payload.interaction
  if (interaction && typeof interaction === 'object') {
    const row = interaction as Record<string, unknown>
    const fromOptions = choiceOptionsFromRaw(row.options, 'opt')
    if (fromOptions.length > 0) {
      return fromOptions
    }
    const fromChoices = choiceOptionsFromRaw(row.choices, 'opt')
    if (fromChoices.length > 0) {
      return fromChoices
    }
  }
  return undefined
}

function choiceOptionsFromRaw(raw: unknown, prefix: string): AgentChoiceOption[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map((item, index) => {
      const cell = item as Record<string, unknown>
      return {
        id: String(cell.id ?? `${prefix}-opt-${index + 1}`),
        title: String(cell.title ?? ''),
        description: String(cell.description ?? ''),
      }
    })
    .filter((item) => item.title)
}

export function hasPendingUserInteraction(stepStates: AgentStepState[]): boolean {
  return stepStates.some((step) => {
    if (step.status !== 'completed' || step.type !== 'tool') {
      return false
    }
    if (isAskUserTool(step.toolName) || step.interaction?.type === 'ask_user') {
      return Boolean(step.interaction?.questions?.length || step.choices?.length)
    }
    if (step.interaction?.type === 'single_select' || step.interaction?.type === 'multi_select') {
      return Boolean(step.choices?.length || step.interaction.options?.length)
    }
    if (step.interaction?.type === 'user_input') {
      return true
    }
    return false
  })
}

function interactionFromPayload(event: AgentEventEnvelope): AgentInteractionPayload | undefined {
  const raw = event.payload.interaction
  if (!raw || typeof raw !== 'object') {
    return undefined
  }
  const row = raw as unknown as Record<string, unknown>
  const options = choiceOptionsFromRaw(row.options, 'opt')
  const questionsRaw = Array.isArray(row.questions) ? row.questions : []
  const questions = questionsRaw
    .map((item, index) => {
      const cell = item as Record<string, unknown>
      const nested =
        cell.interaction && typeof cell.interaction === 'object'
          ? (cell.interaction as Record<string, unknown>)
          : undefined
      const qOptionsRaw = Array.isArray(cell.options)
        ? cell.options
        : nested && Array.isArray(nested.options)
          ? nested.options
          : []
      const qOptions = choiceOptionsFromRaw(qOptionsRaw, `q${index}`)
      const prompt = String(cell.prompt ?? cell.question ?? nested?.prompt ?? '')
      let qTypeRaw = cell.type ?? nested?.type
      let qType =
        qTypeRaw === 'multi_select' || qTypeRaw === 'user_input' || qTypeRaw === 'single_select'
          ? qTypeRaw
          : 'single_select'
      if (
        (qType === 'single_select' || qType === 'multi_select') &&
        qOptions.length === 0
      ) {
        qType = 'user_input'
      }
      return {
        id: String(cell.id ?? `q-${index + 1}`),
        prompt,
        type: qType as AskUserQuestion['type'],
        options: qOptions.length > 0 ? qOptions : undefined,
        free_text_hint:
          typeof cell.free_text_hint === 'string'
            ? cell.free_text_hint
            : typeof nested?.free_text_hint === 'string'
              ? nested.free_text_hint
              : undefined,
      }
    })
    .filter((q) => q.prompt)
  const kindOrType = String(row.type ?? row.kind ?? '').trim()
  if (!kindOrType && questions.length === 0 && options.length === 0) {
    return undefined
  }
  let type: AgentInteractionPayload['type'] = 'ask_user'
  if (kindOrType === 'choose' || kindOrType === 'single_select') {
    type = options.length > 0 ? 'single_select' : 'ask_user'
  } else if (kindOrType === 'multi_select') {
    type = 'multi_select'
  } else if (kindOrType === 'user_input') {
    type = 'user_input'
  } else if (kindOrType === 'ask_user' && questions.length > 0) {
    type = 'ask_user'
  } else if (options.length > 0) {
    type = 'single_select'
  }
  return {
    type,
    prompt: typeof row.prompt === 'string' ? row.prompt : undefined,
    free_text_hint: typeof row.free_text_hint === 'string' ? row.free_text_hint : undefined,
    allow_custom: row.allow_custom === true,
    min_select: typeof row.min_select === 'number' ? row.min_select : undefined,
    max_select: typeof row.max_select === 'number' ? row.max_select : undefined,
    options: options.length > 0 ? options : undefined,
    questions: questions.length > 0 ? questions : undefined,
  }
}

function isInteractionToolRunning(stepStates: AgentStepState[]): boolean {
  return stepStates.some(
    (s) =>
      s.type === 'tool' &&
      isAskUserTool(s.toolName) &&
      s.status === 'started',
  )
}

function isAnyToolRunning(stepStates: AgentStepState[]): boolean {
  return stepStates.some((s) => s.type === 'tool' && s.status === 'started')
}

const CHAT_STREAM_TOOLS = new Set(['Write', 'output'])

function isChatStreamToolRunning(stepStates: AgentStepState[]): boolean {
  return stepStates.some(
    (s) => s.type === 'tool' && CHAT_STREAM_TOOLS.has(s.toolName ?? '') && s.status === 'started',
  )
}

function shouldAcceptThinkDelta(stepStates: AgentStepState[], text: string): boolean {
  if (isLeakedThinkDelta(text) || text.includes('<think>')) {
    return false
  }
  if (isInteractionToolRunning(stepStates)) {
    return false
  }
  if (isChatStreamToolRunning(stepStates)) {
    return true
  }
  return !isAnyToolRunning(stepStates)
}

function isLeakedThinkDelta(text: string): boolean {
  if (/The user|pydantic|Field required|input_value=|step_kind|```json|redacted_thinking/i.test(text)) {
    return true
  }
  if (/^[\s\S]*"display"\s*:/.test(text) && text.includes('"content"')) {
    return true
  }
  const letters = (text.match(/[a-zA-Z]/g) ?? []).length
  return text.length > 30 && letters / text.length > 0.35
}

function applyChoiceStrip(
  state: AgentStreamUiState,
  choiceTitles?: string[],
): AgentStreamUiState {
  const titles = choiceTitles ?? []
  const stripped = stripChoiceBlocksFromMessage(state.messageContent, { choiceTitles: titles })
  const intro = messageIntroBeforeChoices(stripped)
  return {
    ...state,
    stripChoiceBlockFromMessage: true,
    messageContent: intro || stripped,
    thinkText: stripChoiceBlocksFromMessage(state.thinkText, { choiceTitles: titles }),
  }
}

function isToolLifecycleEvent(eventType: string): boolean {
  return (
    eventType === 'tool.started' ||
    eventType === 'tool.completed' ||
    eventType === 'tool.failed'
  )
}

function traceEntryId(event: AgentEventEnvelope, fallbackPrefix: string): string {
  if (typeof event.sequence === 'number') {
    return `${fallbackPrefix}-${event.sequence}`
  }
  return `${fallbackPrefix}-${event.step_id ?? Date.now()}`
}

/** 与后端 tool 事件同一 step_id，合并 started / progress / completed */
function canonicalToolStepId(event: AgentEventEnvelope, fallbackPrefix: string): string {
  if (typeof event.step_id === 'string' && event.step_id.trim()) {
    return event.step_id.trim()
  }
  return traceEntryId(event, fallbackPrefix)
}

function recomputeActiveToolCount(stepStates: AgentStepState[]): number {
  return stepStates.filter((s) => s.type === 'tool' && s.status === 'started').length
}

export function applyAgentEvent(
  state: AgentStreamUiState,
  eventName: string,
  rawData: string,
): AgentStreamUiState {
  if (eventName === 'stream-end') {
    return {
      ...state,
      isStreamEnded: true,
      runTerminalAck: true,
      activeToolCount: 0,
      isThinking: false,
      timeline: finalizeTimeline(state.timeline),
    }
  }

  if (eventName !== 'agent-event') {
    return state
  }

  let event: AgentEventEnvelope
  try {
    event = JSON.parse(rawData) as AgentEventEnvelope
  } catch {
    return state
  }

  if (isDuplicateEvent(state, event)) {
    return state
  }

  const marked = markEventSeen(state, event)
  let next: AgentStreamUiState = {
    ...marked,
    timeline: normalizeTimelineBlockIds(applyTimelineEvent(marked.timeline, event)),
  }

  if (event.run_id) {
    next = { ...next, runId: event.run_id }
  }

  if (event.type === 'gateway.connected') {
    next = { ...next, isThinking: true }
  }

  if (event.type === 'run.heartbeat') {
    return next
  }

  if (event.type === 'run.recovering') {
    const msg =
      typeof event.payload.message === 'string'
        ? event.payload.message
        : '连接中断，正在自动恢复…'
    next = { ...next, hostGuardMessage: msg, streamError: undefined }
  }

  if (event.type === 'context.usage') {
    next = {
      ...next,
      contextUsage: contextUsageFromPayload(event.payload as Record<string, unknown>),
    }
  }

  if (event.type === 'context.compacted') {
    const msg =
      typeof event.payload.message === 'string'
        ? event.payload.message
        : '上下文已自动压缩'
    const mode =
      typeof event.payload.mode === 'string' ? event.payload.mode : undefined
    next = {
      ...next,
      contextUsage: next.contextUsage
        ? {
            ...next.contextUsage,
            compressed: true,
            compactNote: msg,
            lastCompactMode: mode ?? next.contextUsage.lastCompactMode,
          }
        : {
            turn: 0,
            promptTokens: Number(event.payload.prompt_tokens) || 0,
            contextLimit: 200_000,
            contextPercent: 0,
            runInputTokens: 0,
            runOutputTokens: 0,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
            compressed: true,
            compactNote: msg,
            lastCompactMode: mode,
          },
    }
  }

  if (event.type === 'run.completed') {
    const pendingInteraction =
      next.awaitingInteraction || hasPendingUserInteraction(next.stepStates)
    next = {
      ...next,
      hostGuardMessage: undefined,
      isThinking: false,
      activeToolCount: 0,
      runTerminalAck: !pendingInteraction,
      isStreamEnded: !pendingInteraction,
      streamError: undefined,
      awaitingInteraction: pendingInteraction,
    }
  }

  if (event.type === 'run.failed') {
    const err = event.payload.error
    const pendingInteraction =
      next.awaitingInteraction || hasPendingUserInteraction(next.stepStates)
    next = {
      ...next,
      hostGuardMessage: undefined,
      isThinking: false,
      activeToolCount: 0,
      runTerminalAck: true,
      isStreamEnded: !pendingInteraction,
      streamError: typeof err === 'string' && err ? err : '运行失败',
      awaitingInteraction: pendingInteraction,
      streamPaused: false,
    }
  }

  if (event.type === 'think.started') {
    next = { ...next, isThinking: true }
  }

  if (event.type === 'think.completed') {
    next = { ...next, isThinking: false }
  }

  if (event.type === 'think.transition') {
    next = { ...next, isThinking: true, awaitingInteraction: false }
  }

  if (event.type === 'planning.next_step') {
    next = { ...next, isThinking: true, awaitingInteraction: false }
  }

  if (event.type === 'planning.completed') {
    next = { ...next, isThinking: false, awaitingInteraction: false }
    const payload = event.payload as Record<string, unknown>
    const nextTool = typeof payload.next_tool === 'string' ? payload.next_tool : ''
    const reason = typeof payload.reason === 'string' ? payload.reason : ''
    const runEnding = nextTool === 'end' || reason === 'no tool_use'
    if (!runEnding) {
      next = { ...next, messageContent: '' }
    }
  }

  if (event.type === 'planning.failed') {
    const err =
      typeof event.payload.error === 'string' && event.payload.error
        ? event.payload.error
        : '规划失败'
    const pendingInteraction =
      next.awaitingInteraction || hasPendingUserInteraction(next.stepStates)
    next = {
      ...next,
      isThinking: false,
      activeToolCount: 0,
      runTerminalAck: !pendingInteraction,
      isStreamEnded: !pendingInteraction,
      streamError: err,
      awaitingInteraction: pendingInteraction,
    }
  }

  if (event.type === 'run.waiting') {
    next = {
      ...next,
      awaitingInteraction: true,
      isThinking: false,
      activeToolCount: 0,
      runTerminalAck: true,
      isStreamEnded: true,
    }
  }

  if (event.type === 'interaction.accepted') {
    next = { ...next, awaitingInteraction: false, isThinking: true }
  }

  if (event.type === 'run.resumed') {
    next = {
      ...next,
      awaitingInteraction: false,
      isThinking: true,
      streamPaused: false,
      isStreamEnded: false,
      runTerminalAck: false,
    }
  }

  if (event.type === 'run.paused') {
    next = { ...next, isThinking: false, streamPaused: true }
  }

  if (event.type === 'run.resumed') {
    next = { ...next, isThinking: true, streamPaused: false }
  }

  if (event.type === 'think.delta') {
    const text = typeof event.payload.text === 'string' ? event.payload.text : ''
    const timelineOwnsThink = next.timeline.some((b) => b.kind === 'think')
    if (
      text &&
      !timelineOwnsThink &&
      !isLeakedThinkDelta(text) &&
      !text.includes('<think>') &&
      shouldAcceptThinkDelta(next.stepStates, text)
    ) {
      const clean = sanitizeThinkText(text)
      if (!clean) {
        return next
      }
      next = {
        ...next,
        isThinking: true,
        thinkText: sanitizeThinkText(`${next.thinkText}${clean}`),
      }
    } else if (text && timelineOwnsThink) {
      next = { ...next, isThinking: true }
    }
  }

  if (event.type === 'narration.delta') {
    return next
  }

  if (event.type === 'message.delta') {
    const text = sanitizeMessageDeltaChunk(
      typeof event.payload.text === 'string' ? event.payload.text : '',
    )
    const chapterLeak =
      /^title:\s/m.test(text) ||
      /^---\s*$/m.test(text) ||
      (text.includes('已写入《') && text.length > 120)
    if (text && chapterLeak) {
      return next
    }
    if (text) {
      if (hasChoiceMarkers(text)) {
        next = { ...next, stripChoiceBlockFromMessage: true }
      }
      const merged = appendMessageDeltaContent(next.messageContent, text)
      const messageContent = next.stripChoiceBlockFromMessage
        ? stripChoiceBlocksFromMessage(merged)
        : merged
      next = {
        ...next,
        messageContent,
      }
    }
  }

  if (
    event.type === 'subagent.started' ||
    event.type === 'subagent.progress' ||
    event.type === 'subagent.completed' ||
    event.type === 'subagent.failed'
  ) {
    next = {
      ...next,
      stepStates: applySubagentStepEvent(next.stepStates, event),
    }
  }

  if (event.type === 'tool.progress') {
    const stepId = canonicalToolStepId(event, 'tool-progress')
    const payloadRecord = event.payload as Record<string, unknown>
    const progressTodos = todosFromPayload(event)
    if (progressTodos?.length) {
      next = {
        ...next,
        todos: mergeTodoLists(next.todos, progressTodos),
      }
      const todoIdx = next.stepStates.findIndex((s) => s.stepId === stepId)
      if (todoIdx >= 0) {
        const stepStates = [...next.stepStates]
        stepStates[todoIdx] = {
          ...stepStates[todoIdx],
          todos: mergeTodoLists(stepStates[todoIdx].todos, progressTodos),
        }
        next = { ...next, stepStates }
      }
    }
    const progressMsg =
      typeof payloadRecord.message === 'string' ? payloadRecord.message : undefined
    const displayExcerpt =
      typeof payloadRecord.display_excerpt === 'string'
        ? payloadRecord.display_excerpt
        : undefined
    const toolName = typeof payloadRecord.name === 'string' ? payloadRecord.name : undefined
    if (toolName === 'output' && next.messageContent.trim()) {
      return next
    }
    if (progressMsg || displayExcerpt) {
      const idx = next.stepStates.findIndex((s) => s.stepId === stepId)
      let stepStates: AgentStepState[]
      if (idx >= 0) {
        const prev = next.stepStates[idx]
        stepStates = [...next.stepStates]
        stepStates[idx] = {
          ...prev,
          ...(progressMsg && !displayExcerpt
            ? { detail: progressMsg, outputSummary: progressMsg }
            : {}),
          ...(displayExcerpt
            ? {
                displayExcerpt,
                toolOutputDetail: displayExcerpt,
                detail: undefined,
              }
            : {}),
        }
      } else {
        const step: AgentStepState = {
          stepId,
          parentStepId: event.parent_step_id,
          type: 'tool',
          status: 'started',
          title: toolTitle(event),
          toolName,
          detail: displayExcerpt ? undefined : progressMsg,
          outputSummary: displayExcerpt ? undefined : progressMsg,
          displayExcerpt,
          toolOutputDetail: displayExcerpt,
        }
        stepStates = [...next.stepStates, step]
      }
      next = {
        ...next,
        stepStates,
        activeToolCount: recomputeActiveToolCount(stepStates),
      }
    }
  }

  if (event.type === 'run.started') {
    next = { ...next, isThinking: true }
  }

  if (event.type === 'step.failed') {
    const stepId = canonicalToolStepId(event, 'step-failed')
    const err =
      typeof event.payload.error === 'string' && event.payload.error.trim()
        ? event.payload.error.trim()
        : '步骤失败'
    const idx = next.stepStates.findIndex((s) => s.stepId === stepId)
    const failedStep: AgentStepState = {
      stepId,
      parentStepId: event.parent_step_id,
      type: 'tool',
      status: 'failed',
      title: toolTitle(event),
      toolName:
        typeof event.payload.tool === 'string'
          ? event.payload.tool
          : typeof event.payload.name === 'string'
            ? event.payload.name
            : undefined,
      detail: err,
      outputSummary: err,
    }
    const stepStates =
      idx >= 0
        ? next.stepStates.map((s, i) =>
            i === idx ? { ...s, ...failedStep, status: 'failed' as const } : s,
          )
        : [...next.stepStates, failedStep]
    next = {
      ...next,
      stepStates,
      activeToolCount: recomputeActiveToolCount(stepStates),
      isThinking: false,
    }
  }

  if (event.type === 'chapter.persist.failed') {
    const stepId = canonicalToolStepId(event, 'chapter-persist-failed')
    const payload = event.payload as Record<string, unknown>
    const displayLabel =
      typeof payload.display_label === 'string' && payload.display_label.trim()
        ? payload.display_label.trim()
        : typeof payload.title === 'string' && payload.title.trim()
          ? payload.title.trim()
          : ''
    const err =
      typeof payload.error === 'string' && payload.error.trim()
        ? payload.error.trim()
        : displayLabel
          ? `章节未能写入作品库：${displayLabel}`
          : '章节未能写入作品库'
    const idx = next.stepStates.findIndex((s) => s.stepId === stepId)
    if (idx >= 0) {
      const stepStates = [...next.stepStates]
      stepStates[idx] = {
        ...stepStates[idx],
        status: 'failed',
        detail: err,
        outputSummary: err,
      }
      next = {
        ...next,
        stepStates,
        activeToolCount: recomputeActiveToolCount(stepStates),
      }
    }
  }

  if (event.type === 'step.completed') {
    const stepId = canonicalToolStepId(event, 'step-completed')
    const idx = next.stepStates.findIndex((s) => s.stepId === stepId)
    const todos = todosFromPayload(event)
    if (idx >= 0 && next.stepStates[idx].status === 'started') {
      const stepStates = [...next.stepStates]
      stepStates[idx] = {
        ...stepStates[idx],
        status: 'completed',
        ...(todos ? { todos } : {}),
      }
      next = {
        ...next,
        stepStates,
        activeToolCount: recomputeActiveToolCount(stepStates),
        ...(todos ? { todos: mergeTodoLists(next.todos, todos) } : {}),
      }
    } else if (todos?.length) {
      next = { ...next, todos: mergeTodoLists(next.todos, todos) }
    }
  }

  if (event.type === 'step.started') {
    const tool = typeof event.payload.tool === 'string' ? event.payload.tool : ''
    const stepId = canonicalToolStepId(event, 'step-started')
    if (tool === 'think') {
      next = { ...next, isThinking: true }
    } else if (tool && !isHiddenUiTool(tool)) {
      const payloadRecord = event.payload as Record<string, unknown>
      const toolArgs = ccToolHumanSubtitleFromPayload(tool, payloadRecord)
      const startedTitle =
        typeof payloadRecord.display_name === 'string' && payloadRecord.display_name.trim()
          ? payloadRecord.display_name.trim()
          : toolDisplayName(tool)
      const startedToolInput =
        payloadRecord.tool_input && typeof payloadRecord.tool_input === 'object'
          ? (payloadRecord.tool_input as Record<string, unknown>)
          : undefined
      const pending: AgentStepState = {
        stepId,
        parentStepId: event.parent_step_id,
        type: 'tool',
        status: 'started',
        title: startedTitle,
        toolName: tool,
        toolInput: startedToolInput,
        toolArgs: toolArgs || undefined,
        detail: toolArgs || undefined,
      }
      const idx = next.stepStates.findIndex((s) => s.stepId === stepId)
      const stepStates =
        idx >= 0
          ? next.stepStates.map((s, i) => (i === idx ? { ...s, ...pending } : s))
          : [...next.stepStates, pending]
      next = {
        ...next,
        stepStates,
        activeToolCount: recomputeActiveToolCount(stepStates),
      }
    }
  }

  if (
    event.type === 'chapter.stream.started' &&
    typeof event.payload?.tool === 'string'
  ) {
    const toolName = event.payload.tool
    const title =
      typeof event.payload.title === 'string' ? event.payload.title : '章节'
    const stepId = canonicalToolStepId(event, 'chapter-stream')
    const progress = chapterWriteProgressLabel(title)
    const step: AgentStepState = {
      stepId,
      parentStepId: event.parent_step_id,
      type: 'tool',
      status: 'started',
      title: toolDisplayName(toolName),
      toolName,
      detail: progress,
      outputSummary: progress,
    }
    const idx = next.stepStates.findIndex((s) => s.stepId === stepId)
    const stepStates =
      idx >= 0
        ? next.stepStates.map((s, i) => (i === idx ? { ...s, ...step } : s))
        : [...next.stepStates, step]
    next = {
      ...next,
      stepStates,
      activeToolCount: recomputeActiveToolCount(stepStates),
    }
  }

  if (event.type === 'chapter.stream.delta') {
    const piece =
      typeof event.payload.text === 'string' ? event.payload.text : ''
    if (!piece) {
      return next
    }
    const stepId = canonicalToolStepId(event, 'chapter-stream')
    const idx = next.stepStates.findIndex((s) => s.stepId === stepId)
    const streamTitle =
      typeof event.payload?.title === 'string' && event.payload.title.trim()
        ? event.payload.title.trim()
        : '章节'
    const progressBase = chapterWriteProgressLabel(streamTitle)
    let stepStates: AgentStepState[]
    if (idx >= 0) {
      const prev = next.stepStates[idx]
      const totalChars = (prev.chapterStreamChars ?? 0) + piece.length
      const excerpt = `${prev.displayExcerpt ?? ''}${piece}`.slice(-160)
      const progress = `${progressBase} · ${totalChars} 字`
      stepStates = [...next.stepStates]
      stepStates[idx] = {
        ...prev,
        status: 'started',
        toolName: prev.toolName ?? 'Write',
        chapterStreamChars: totalChars,
        displayExcerpt: excerpt,
        toolOutputDetail: excerpt,
        detail: progress,
        outputSummary: progress,
      }
    } else {
      const excerpt = piece.slice(-160)
      const progress = `${progressBase} · ${piece.length} 字`
      const step: AgentStepState = {
        stepId,
        parentStepId: event.parent_step_id,
        type: 'tool',
        status: 'started',
        title: toolDisplayName(
          typeof event.payload?.tool === 'string' ? event.payload.tool : 'Write',
        ),
        toolName:
          typeof event.payload?.tool === 'string' ? event.payload.tool : 'Write',
        chapterStreamChars: piece.length,
        displayExcerpt: excerpt,
        toolOutputDetail: excerpt,
        detail: progress,
        outputSummary: progress,
      }
      stepStates = [...next.stepStates, step]
    }
    next = {
      ...next,
      stepStates,
      activeToolCount: recomputeActiveToolCount(stepStates),
    }
  }

  if (event.type === 'chapter.stream.completed') {
    const stepId = canonicalToolStepId(event, 'chapter-stream')
    const idx = next.stepStates.findIndex((s) => s.stepId === stepId)
    if (idx >= 0) {
      const stepStates = [...next.stepStates]
      stepStates[idx] = {
        ...stepStates[idx],
        detail: undefined,
      }
      next = {
        ...next,
        stepStates,
        activeToolCount: recomputeActiveToolCount(stepStates),
      }
    }
  }

  if (isToolLifecycleEvent(event.type)) {
    const stepId = canonicalToolStepId(event, event.type.replace('.', '-'))
    const toolName = typeof event.payload.name === 'string' ? event.payload.name : undefined
    const choices =
      event.type === 'tool.completed'
        ? choicesFromPayload(event)
        : undefined
    const interaction =
      event.type === 'tool.completed'
        ? interactionFromPayload(event)
        : undefined
    const mergedChoices = choices ?? interaction?.options
    const todos =
      event.type === 'tool.completed' ? todosFromPayload(event) : undefined
    const outputSummary = outputSummaryFromPayload(event)
    const resultLabels = wireResultLabels(event)

    const payloadRecord = event.payload as Record<string, unknown>
    const toolInputRaw =
      payloadRecord.tool_input && typeof payloadRecord.tool_input === 'object'
        ? (payloadRecord.tool_input as Record<string, unknown>)
        : undefined
    const toolInputText = formatToolInputFromPayload(toolInputRaw)
    const invTool =
      normalizeToolName(toolName) === 'Glob' || normalizeToolName(toolName) === 'Grep'
    const displayExcerpt =
      !invTool && typeof payloadRecord.display_excerpt === 'string'
        ? payloadRecord.display_excerpt
        : undefined
    const toolOutputDetail =
      event.type === 'tool.completed'
        ? toolOutputFromPayload(payloadRecord, toolName) ||
          (!invTool && typeof payloadRecord.display_excerpt === 'string'
            ? payloadRecord.display_excerpt
            : undefined)
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
    const step: AgentStepState = {
      stepId,
      parentStepId: event.parent_step_id,
      type: 'tool',
      status: stepStatusFromEventType(event.type, payloadRecord),
      title: toolTitle(event),
      toolName,
      toolArgs: toolArgs || undefined,
      toolInput: toolInputRaw,
      toolInputText: toolInputText || undefined,
      toolOutputDetail: toolOutputDetail || undefined,
      displayExcerpt: displayExcerpt || undefined,
      detail: toolArgs || outputSummary,
      outputSummary,
      resultLabels: resultLabels?.length ? resultLabels : undefined,
      choices: mergedChoices,
      interaction,
      todos,
    }

    const idx = next.stepStates.findIndex((s) => s.stepId === stepId)
    let stepStates: AgentStepState[]
    if (idx >= 0) {
      const prev = next.stepStates[idx]
      stepStates = [...next.stepStates]
      const merged = { ...prev, ...step }
      stepStates[idx] = {
        ...merged,
        toolArgs: merged.toolArgs ?? prev.toolArgs,
        toolInput: merged.toolInput ?? prev.toolInput,
        toolInputText: merged.toolInputText ?? prev.toolInputText,
        toolOutputDetail: merged.toolOutputDetail ?? prev.toolOutputDetail,
        displayExcerpt: merged.displayExcerpt ?? prev.displayExcerpt,
        detail: merged.detail ?? prev.detail,
        outputSummary:
          event.type === 'tool.completed'
            ? outputSummary
            : merged.outputSummary ?? prev.outputSummary,
        detail:
          event.type === 'tool.completed'
            ? step.detail
            : merged.detail ?? prev.detail,
        resultLabels: merged.resultLabels ?? prev.resultLabels,
        choices: merged.choices ?? prev.choices,
        interaction: merged.interaction ?? prev.interaction,
        todos: merged.todos ?? prev.todos,
      }
      if (
        event.type === 'tool.completed' &&
        normalizeToolName(toolName) === 'Agent' &&
        stepStates[idx].subagent
      ) {
        const prevSub = stepStates[idx].subagent!
        const toolBody =
          stepStates[idx].toolOutputDetail ||
          stepStates[idx].outputSummary ||
          ''
        const streamed = prevSub.summaryPreview?.trim() ?? ''
        const merged =
          streamed && toolBody && streamed.length > toolBody.length
            ? streamed
            : toolBody || streamed
        stepStates[idx] = {
          ...stepStates[idx],
          subagent: merged
            ? { ...prevSub, summaryPreview: merged }
            : prevSub,
          displayExcerpt: undefined,
          toolOutputDetail: undefined,
          outputSummary: undefined,
          detail: stepStates[idx].toolArgs ?? stepStates[idx].detail,
        }
      }
    } else {
      stepStates = [...next.stepStates, step]
    }

    next = {
      ...next,
      stepStates,
      activeToolCount: recomputeActiveToolCount(stepStates),
      ...(todos ? { todos: mergeTodoLists(next.todos, todos) } : {}),
    }

    if (mergedChoices && mergedChoices.length > 0) {
      next = applyChoiceStrip(
        next,
        mergedChoices.map((c) => c.title),
      )
    }

    if (
      event.type === 'tool.completed' &&
      (interaction || (mergedChoices && mergedChoices.length > 0))
    ) {
      next = { ...next, awaitingInteraction: true, isThinking: false }
    }

    if (
      event.type === 'tool.completed' &&
      toolName === 'output' &&
      typeof event.payload.output === 'string' &&
      event.payload.output.trim()
    ) {
      const formatted = sanitizeAssistantMessage(event.payload.output)
      if (formatted) {
        const body = next.stripChoiceBlockFromMessage
          ? stripChoiceBlocksFromMessage(formatted)
          : formatted
        if (!next.messageContent.trim()) {
          next = { ...next, messageContent: body }
        }
      }
    }

  }

  if (next.stripChoiceBlockFromMessage && next.messageContent) {
    const titles = next.stepStates
      .flatMap((s) => s.choices ?? [])
      .map((c) => c.title)
    next = applyChoiceStrip(next, titles)
  }

  return next
}

function normalizeAssistantCompareText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function assistantTextAlreadyInTimeline(
  timeline: AgentTimelineBlock[],
  body: string,
): boolean {
  const fromTimeline = timeline
    .filter((b): b is Extract<AgentTimelineBlock, { kind: 'text' }> => b.kind === 'text')
    .map((b) => b.content)
    .join('')
  const normTimeline = normalizeAssistantCompareText(fromTimeline)
  const normBody = normalizeAssistantCompareText(body)
  if (!normTimeline || !normBody) {
    return false
  }
  if (normTimeline.includes(normBody) || normBody.includes(normTimeline)) {
    return true
  }
  const probeLen = Math.min(160, normBody.length, normTimeline.length)
  if (probeLen < 48) {
    return false
  }
  const probe = normBody.slice(0, probeLen)
  return normTimeline.includes(probe)
}

function mergeAssistantTextFromTimeline(state: AgentStreamUiState): string {
  const fromTimeline = state.timeline
    .filter((b): b is Extract<AgentTimelineBlock, { kind: 'text' }> => b.kind === 'text')
    .map((b) => b.content)
    .filter((chunk) => chunk.trim())
    .join('\n\n')
  if (fromTimeline.trim()) {
    return sanitizeAssistantMessage(fromTimeline)
  }
  return sanitizeAssistantMessage(state.messageContent)
}

export function finalizeAgentMessageContent(state: AgentStreamUiState): string {
  const base = sanitizeAssistantMessage(mergeAssistantTextFromTimeline(state))
  const hasChoiceCards = state.stepStates.some((s) => (s.choices?.length ?? 0) > 0)
  const hasToolSummary = state.stepStates.some(
    (s) =>
      Boolean(s.outputSummary?.trim()) ||
      Boolean(s.displayExcerpt?.trim()) ||
      Boolean(s.resultLabels?.length),
  )
  const hasStructuredUi = hasChoiceCards || hasToolSummary
  const withFallback = base.trim() ? base : base
  if (state.stripChoiceBlockFromMessage) {
    return stripChoiceBlocksFromMessage(withFallback)
  }
  if (!withFallback.trim() && (state.isStreamEnded || state.runTerminalAck) && !hasStructuredUi) {
    return state.streamError
      ? '本轮执行失败，请重试。'
      : '我在。请给我一句更明确的创作指令（人物+场景+冲突+字数）。'
  }
  return withFallback
}

export function findPendingInteractionStepId(
  stepStates: AgentStepState[],
): string | undefined {
  for (let i = stepStates.length - 1; i >= 0; i -= 1) {
    const step = stepStates[i]
    if (step.type !== 'tool') {
      continue
    }
    if (isAskUserTool(step.toolName) || step.interaction?.type === 'ask_user') {
      if (step.interaction?.questions?.length) {
        return step.stepId
      }
    }
    if (step.status !== 'completed') {
      continue
    }
    if (isAskUserTool(step.toolName) && (step.choices?.length ?? 0) > 0) {
      return step.stepId
    }
    if (
      step.interaction?.type === 'single_select' ||
      step.interaction?.type === 'multi_select'
    ) {
      if ((step.choices?.length ?? 0) > 0 || (step.interaction.options?.length ?? 0) > 0) {
        return step.stepId
      }
    }
    if (step.interaction?.type === 'user_input') {
      return step.stepId
    }
  }
  return undefined
}

export function applyChoiceSelection(
  state: AgentStreamUiState,
  choice: AgentChoiceOption,
  stepId?: string,
): AgentStreamUiState {
  const resolvedStepId = stepId ?? findPendingInteractionStepId(state.stepStates)
  return {
    ...state,
    awaitingInteraction: false,
    timeline: appendChoiceSelected(state.timeline, choice, resolvedStepId),
  }
}
