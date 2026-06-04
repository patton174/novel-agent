import type {
  AgentStepState,
  AgentSubagentLogEntry,
  AgentTimelineBlock,
} from '../types/agent'
import type { ThinkRoundPayload } from './agentStreamTimeline'
import { sanitizeThinkText } from './sanitizeAgentText'
import {
  subagentToolEntries,
  type SubagentToolDisplayEntry,
} from './subagentLogLabel'
import { enrichSubagentToolLogs, subagentLogToStep } from './subagentToolStep'

export type SubagentOrchestrationBundle = {
  rounds: ThinkRoundPayload[]
  stepStates: AgentStepState[]
  toolEntries: SubagentToolDisplayEntry[]
}

function toolBlockFromEntry(entry: AgentSubagentLogEntry): Extract<
  AgentTimelineBlock,
  { kind: 'tool' }
> {
  return { kind: 'tool', id: entry.id, stepId: entry.id }
}

function reasoningBlockFromLog(
  log: AgentSubagentLogEntry,
  opts: { streamActive: boolean },
): Extract<AgentTimelineBlock, { kind: 'reasoning' }> | null {
  const text = sanitizeThinkText((log.excerpt || log.title || '').trim())
  if (!text && !log.reasoningOpen) {
    return null
  }
  const open = Boolean(log.reasoningOpen) && opts.streamActive
  return {
    kind: 'reasoning',
    id: log.id,
    text,
    status: open ? 'active' : 'done',
  }
}

function thinkBlockFromText(
  text: string,
  roundIndex: number,
  streamActive: boolean,
): AgentTimelineBlock {
  return {
    kind: 'think',
    id: `subagent-think:${roundIndex}`,
    text: sanitizeThinkText(text.trim()),
    status: streamActive ? 'active' : 'done',
  }
}

/** 按子 Agent 轮次拆成与主时间线相同的 think_round → OrchestrationLayer */
export function buildSubagentOrchestration(
  logs: AgentSubagentLogEntry[],
  opts: { runActive: boolean; fallbackThinkText?: string },
): SubagentOrchestrationBundle {
  const streamActive = opts.runActive
  const enriched = enrichSubagentToolLogs(logs)
  const toolEntries = subagentToolEntries(
    logs,
    { runActive: opts.runActive },
    enriched,
  )
  const stepStates = toolEntries.map(({ entry, status }) =>
    subagentLogToStep(entry, status),
  )
  const doneById = new Map(
    toolEntries
      .filter((row) => row.entry.phase === 'tool_done' || row.status === 'success')
      .map((row) => [row.entry.id, row]),
  )

  const rounds: ThinkRoundPayload[] = []
  let roundInsight: AgentTimelineBlock[] = []
  let roundTools: Extract<AgentTimelineBlock, { kind: 'tool' }>[] = []

  const flushRound = () => {
    const items: ThinkRoundPayload['items'] = []
    if (roundInsight.length > 0) {
      items.push({ kind: 'insight', blocks: [...roundInsight] })
    }
    if (roundTools.length > 0) {
      items.push({ kind: 'tools', blocks: [...roundTools] })
    }
    if (items.length > 0) {
      rounds.push({ items })
    }
    roundInsight = []
    roundTools = []
  }

  for (const log of logs) {
    if (log.phase === '_turn' || log.phase === 'turn') {
      flushRound()
      continue
    }
    if (log.phase === 'reasoning') {
      const block = reasoningBlockFromLog(log, { streamActive })
      if (block) {
        const existingIdx = roundInsight.findIndex((b) => b.id === block.id)
        if (existingIdx >= 0) {
          roundInsight[existingIdx] = block
        } else {
          roundInsight.push(block)
        }
      }
      continue
    }
    if (log.phase === 'tool_done' && doneById.has(log.id)) {
      roundTools.push(toolBlockFromEntry(log))
      continue
    }
    if (log.phase === 'tool_started') {
      const key = log.id.replace(/^tool_started:/, '')
      const doneId = `tool_done:${key}`
      if (!doneById.has(doneId)) {
        roundTools.push(toolBlockFromEntry({ ...log, id: log.id }))
      }
    }
  }
  flushRound()

  const hasReasoning = logs.some((l) => l.phase === 'reasoning' && (l.excerpt || '').trim())
  const fallback = sanitizeThinkText((opts.fallbackThinkText || '').trim())

  if (rounds.length === 0) {
    const tools = toolEntries.map((row) => toolBlockFromEntry(row.entry))
    if (fallback || tools.length > 0) {
      const items: ThinkRoundPayload['items'] = []
      if (fallback) {
        items.push({ kind: 'insight', blocks: [thinkBlockFromText(fallback, 0, false)] })
      }
      if (tools.length > 0) {
        items.push({ kind: 'tools', blocks: tools })
      }
      rounds.push({ items })
    }
  } else if (fallback && !hasReasoning && rounds[0]) {
    const first = rounds[0]
    const insightItem = first.items.find(
      (item): item is Extract<ThinkRoundPayload['items'][number], { kind: 'insight' }> =>
        item.kind === 'insight',
    )
    if (insightItem) {
      insightItem.blocks.unshift(thinkBlockFromText(fallback, 0, false))
    } else {
      first.items.unshift({
        kind: 'insight',
        blocks: [thinkBlockFromText(fallback, 0, false)],
      })
    }
  }

  return { rounds, stepStates, toolEntries }
}
