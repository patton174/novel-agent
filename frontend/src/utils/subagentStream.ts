import type {
  AgentEventEnvelope,
  AgentStepState,
  AgentSubagentLogEntry,
  AgentSubagentState,
} from '../types/agent'
import { sanitizeThinkText } from './sanitizeAgentText'

const MAX_SUBAGENT_LOGS = 160

function reasoningLogId(turn: number): string {
  return `reasoning:turn:${turn}`
}

function resolveSubagentTurn(
  sub: AgentSubagentState | undefined,
  payload: Record<string, unknown>,
): number {
  if (typeof payload.turn === 'number') {
    return payload.turn
  }
  return sub?.turn ?? 0
}

function closeOpenReasoningLogs(
  logs: AgentSubagentLogEntry[],
): AgentSubagentLogEntry[] {
  return logs.map((log) =>
    log.phase === 'reasoning' && log.reasoningOpen
      ? { ...log, reasoningOpen: false }
      : log,
  )
}

function parentStepIdFromPayload(event: AgentEventEnvelope): string {
  const p = event.payload as Record<string, unknown>
  const fromPayload =
    typeof p.parent_step_id === 'string' ? p.parent_step_id.trim() : ''
  if (fromPayload) {
    return fromPayload
  }
  return typeof event.step_id === 'string' ? event.step_id.trim() : ''
}

function ensureAgentParentStep(
  stepStates: AgentStepState[],
  parentStepId: string,
  description: string,
): AgentStepState[] {
  if (stepStates.some((s) => s.stepId === parentStepId)) {
    return stepStates
  }
  return [
    ...stepStates,
    {
      stepId: parentStepId,
      type: 'tool',
      status: 'started',
      title: '子 Agent',
      toolName: 'Agent',
      detail: description,
    },
  ]
}

function upsertStepSubagent(
  stepStates: AgentStepState[],
  parentStepId: string,
  updater: (prev: AgentSubagentState | undefined) => AgentSubagentState,
  description = '子任务',
): AgentStepState[] {
  let working = ensureAgentParentStep(stepStates, parentStepId, description)
  const idx = working.findIndex((s) => s.stepId === parentStepId)
  if (idx < 0) {
    return stepStates
  }
  const prev = working[idx]
  const nextSub = updater(prev.subagent)
  const stepStatesNext = [...working]
  stepStatesNext[idx] = { ...prev, subagent: nextSub }
  return stepStatesNext
}

function appendLog(
  sub: AgentSubagentState,
  entry: AgentSubagentLogEntry,
): AgentSubagentState {
  const logs = [...sub.logs]
  const existingIdx = logs.findIndex((l) => l.id === entry.id)
  if (existingIdx >= 0) {
    logs[existingIdx] = { ...logs[existingIdx], ...entry }
  } else {
    logs.push(entry)
  }
  if (logs.length > MAX_SUBAGENT_LOGS) {
    logs.splice(0, logs.length - MAX_SUBAGENT_LOGS)
  }
  return { ...sub, logs }
}

export function applySubagentStepEvent(
  stepStates: AgentStepState[],
  event: AgentEventEnvelope,
): AgentStepState[] {
  const parentId = parentStepIdFromPayload(event)
  if (!parentId) {
    return stepStates
  }

  const p = event.payload as Record<string, unknown>

  const description =
    typeof p.description === 'string' ? p.description : '子任务'

  if (event.type === 'subagent.started') {
    return upsertStepSubagent(
      stepStates,
      parentId,
      () => ({
        description,
        childRunId:
          typeof p.child_run_id === 'string' ? p.child_run_id : undefined,
        status: 'active',
        maxTurns: typeof p.max_turns === 'number' ? p.max_turns : undefined,
        turn: 0,
        logs: [],
      }),
      description,
    )
  }

  if (event.type === 'subagent.progress') {
    const phase = typeof p.phase === 'string' ? p.phase : 'progress'

    if (phase === '_turn' && typeof p.turn === 'number') {
      const turnEntry: AgentSubagentLogEntry = {
        id: `_turn:${p.turn}`,
        phase: '_turn',
        title: '',
        turn: p.turn as number,
      }
      return upsertStepSubagent(stepStates, parentId, (sub) => {
        const base = sub ?? {
          description,
          status: 'active' as const,
          logs: [],
        }
        return {
          ...appendLog(base, turnEntry),
          turn: p.turn as number,
        }
      }, description)
    }

    if (phase === 'reasoning_start') {
      return upsertStepSubagent(stepStates, parentId, (sub) => {
        const turn = resolveSubagentTurn(sub, p)
        const base = sub ?? { description, status: 'active' as const, logs: [] }
        const entry: AgentSubagentLogEntry = {
          id: reasoningLogId(turn),
          phase: 'reasoning',
          title: '',
          excerpt: '',
          turn,
          reasoningOpen: true,
        }
        return appendLog(base, entry)
      }, description)
    }

    if (phase === 'reasoning_end') {
      return upsertStepSubagent(stepStates, parentId, (sub) => {
        if (!sub) {
          return { description, status: 'active', logs: [] }
        }
        const turn = resolveSubagentTurn(sub, p)
        const id = reasoningLogId(turn)
        const existing = sub.logs.find((l) => l.id === id)
        if (!existing) {
          return sub
        }
        return appendLog(sub, { ...existing, reasoningOpen: false })
      }, description)
    }

    if (phase === 'reasoning') {
      const snippet = typeof p.snippet === 'string' ? p.snippet : ''
      const clean = sanitizeThinkText(snippet)
      if (!clean) {
        return stepStates
      }
      return upsertStepSubagent(stepStates, parentId, (sub) => {
        const turn = resolveSubagentTurn(sub, p)
        const base = sub ?? { description, status: 'active' as const, logs: [] }
        const id = reasoningLogId(turn)
        const prev = base.logs.find((l) => l.id === id)
        const merged = sanitizeThinkText(`${prev?.excerpt ?? ''}${clean}`)
        const entry: AgentSubagentLogEntry = {
          id,
          phase: 'reasoning',
          title: '',
          excerpt: merged,
          turn,
          reasoningOpen: prev?.reasoningOpen ?? true,
        }
        return {
          ...appendLog(base, entry),
          thinkText: merged,
        }
      }, description)
    }

    if (phase === 'output_delta') {
      const snippet = typeof p.snippet === 'string' ? p.snippet : ''
      if (!snippet) {
        return stepStates
      }
      return upsertStepSubagent(stepStates, parentId, (sub) => {
        const base = sub ?? { description, status: 'active' as const, logs: [] }
        const prev = base.summaryPreview ?? ''
        return {
          ...base,
          summaryPreview: `${prev}${snippet}`,
        }
      }, description)
    }
    const childStepId =
      typeof p.child_step_id === 'string' ? p.child_step_id : ''
    const id = childStepId
      ? `${phase}:${childStepId}`
      : `${phase}:${event.sequence ?? stepStates.length}`
    const title =
      typeof p.title === 'string'
        ? p.title
        : typeof p.tool === 'string'
          ? p.tool
          : phase
    const labelsRaw = p.result_labels
    const resultLabels = Array.isArray(labelsRaw)
      ? labelsRaw
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .filter(Boolean)
      : undefined
    const toolInputRaw = p.tool_input
    const toolInput =
      toolInputRaw && typeof toolInputRaw === 'object'
        ? (toolInputRaw as Record<string, unknown>)
        : undefined
    const entry: AgentSubagentLogEntry = {
      id,
      phase,
      title,
      tool: typeof p.tool === 'string' ? p.tool : undefined,
      status:
        phase === 'tool_done'
          ? 'completed'
          : phase === 'tool_started'
            ? 'started'
            : phase === 'error'
              ? 'failed'
              : undefined,
      excerpt: typeof p.excerpt === 'string' ? p.excerpt : undefined,
      turn: typeof p.turn === 'number' ? p.turn : undefined,
      filePath:
        typeof p.file_path === 'string' && p.file_path.trim()
          ? p.file_path.trim()
          : undefined,
      displayName:
        typeof p.display_name === 'string' && p.display_name.trim()
          ? p.display_name.trim()
          : undefined,
      resultLabels: resultLabels?.length ? resultLabels : undefined,
      toolInput,
    }
    return upsertStepSubagent(
      stepStates,
      parentId,
      (sub) => {
      if (!sub) {
        return {
          description,
          status: 'active',
          logs: [entry],
          turn: entry.turn,
        }
      }
      const tagged: AgentSubagentLogEntry = {
        ...entry,
        turn:
          typeof p.turn === 'number'
            ? p.turn
            : sub.turn ?? entry.turn,
      }
      let next = appendLog(sub, tagged)
      if (typeof p.turn === 'number') {
        next = { ...next, turn: p.turn }
      }
      if (phase === 'turn') {
        next = { ...next, turn: p.turn as number | undefined }
      }
      return next
    },
      description,
    )
  }

  if (event.type === 'subagent.completed') {
    return upsertStepSubagent(stepStates, parentId, (sub) => {
      const incoming =
        typeof p.summary_preview === 'string' ? p.summary_preview.trim() : ''
      const prev = sub?.summaryPreview?.trim() ?? ''
      let summaryPreview = prev || undefined
      if (incoming) {
        if (!prev) {
          summaryPreview = incoming
        } else if (incoming.length >= prev.length) {
          summaryPreview = incoming
        } else if (prev.startsWith(incoming) || incoming.startsWith(prev.slice(0, Math.min(prev.length, 200)))) {
          summaryPreview = prev
        } else {
          summaryPreview = prev.length > incoming.length ? prev : incoming
        }
      }
      return {
        description: sub?.description ?? '子任务',
        childRunId: sub?.childRunId,
        status: 'done',
        maxTurns: sub?.maxTurns,
        turn: typeof p.turns === 'number' ? p.turns : sub?.turn,
        logs: closeOpenReasoningLogs(sub?.logs ?? []),
        thinkText: sub?.thinkText,
        summaryPreview,
      }
    }, description)
  }

  if (event.type === 'subagent.failed') {
    return upsertStepSubagent(stepStates, parentId, (sub) => ({
      description: sub?.description ?? '子任务',
      childRunId: sub?.childRunId,
      status: 'failed',
      maxTurns: sub?.maxTurns,
      turn: sub?.turn,
      logs: closeOpenReasoningLogs(sub?.logs ?? []),
      thinkText: sub?.thinkText,
      error: typeof p.error === 'string' ? p.error : '子任务失败',
    }), description)
  }

  return stepStates
}
