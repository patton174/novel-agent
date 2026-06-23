import type { AgentSubagentLogEntry } from '../types/agent'
import { toolDisplayName } from './agentLabels'
import { normalizeToolName } from './agentToolNames'

const SKIP_TITLE = /^(Read|Write|Edit|Glob|Grep|Delete|Agent|执行中|编排中)/i

export function formatSubagentLogLabel(entry: AgentSubagentLogEntry): string {
  if (entry.phase === 'turn') {
    const t = (entry.title || '').trim()
    if (t && !/^(执行|编排)/.test(t)) {
      return t.replace(/^调用模型(?:编排)?[….]*$/u, '执行中…')
    }
    return '执行中…'
  }

  if (entry.phase === 'error') {
    return entry.title || '步骤失败'
  }

  const title = (entry.title || '').trim()
  if (title && !SKIP_TITLE.test(title)) {
    return title
  }

  const tool = normalizeToolName(entry.tool || '')
  const memoryPath = /\/memory\//i.test(title) || title.includes('记忆')
  if (tool === 'Read') {
    return memoryPath ? '查阅创作记忆' : '阅读章节'
  }
  if (tool === 'Write') {
    return memoryPath ? '写入创作记忆' : '写入章节'
  }
  if (tool === 'Edit') {
    return memoryPath ? '编辑创作记忆' : '编辑章节'
  }
  if (tool === 'Glob' || tool === 'Grep') {
    return toolDisplayName(tool)
  }

  return toolDisplayName(entry.tool || entry.phase)
}

export type SubagentToolDisplayEntry = {
  entry: AgentSubagentLogEntry
  status: 'loading' | 'success' | 'error' | 'idle'
}

/** Prefer completed tool rows; hide in-flight starts when a done row exists. */
export function visibleSubagentLogs(
  logs: AgentSubagentLogEntry[],
): AgentSubagentLogEntry[] {
  const doneKeys = new Set(
    logs
      .filter((l) => l.phase === 'tool_done' && l.id.includes(':'))
      .map((l) => l.id.replace(/^tool_done:/, '')),
  )
  return logs.filter((l) => {
    if (
      l.phase === 'turn' ||
      l.phase === '_turn' ||
      l.phase === 'reasoning' ||
      l.phase === 'reasoning_start' ||
      l.phase === 'reasoning_end'
    ) {
      return false
    }
    if (l.phase === 'tool_started') {
      const key = l.id.replace(/^tool_started:/, '')
      return !doneKeys.has(key)
    }
    return true
  })
}

/** 仅工具步骤（执行/思考由 PlanningStack + thinkText 展示） */
export function subagentToolEntries(
  logs: AgentSubagentLogEntry[],
  opts: { runActive: boolean },
  enriched?: AgentSubagentLogEntry[],
): SubagentToolDisplayEntry[] {
  const visible = enriched ?? visibleSubagentLogs(logs)
  return visible.map((entry, index) => {
    const isLast = index === visible.length - 1
    const status =
      entry.status === 'failed'
        ? 'error'
        : entry.phase === 'tool_done' || entry.status === 'completed'
          ? 'success'
          : opts.runActive && isLast
            ? 'loading'
            : 'success'
    return { entry, status }
  })
}