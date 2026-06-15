import type { AgentSubagentState } from '../types/agent'
import { formatSubagentLogLabel, visibleSubagentLogs } from './subagentLogLabel'
import { resolveSubagentSummaryBody } from './subagentSummary'
import { formatSubagentToolStats } from './subagentActivity'

export type SubagentVisualStatus = 'loading' | 'success' | 'error'

export type SubagentDisplayMeta = {
  name: string
  description: string
  statusKind: SubagentVisualStatus
  statusLabel: string
  currentStep: string | null
  turnHint: string | null
  /** 完整 Markdown 输出（模态正文） */
  summaryBody: string | null
  /** 原始全文（未 strip，模态 fallback） */
  fullOutput: string | null
  /** 完成后工具统计（灰色，跟在标题后） */
  toolStats: string | null
}

function subagentNameFromDescription(description: string, kind?: string): string {
  if (kind === 'review') {
    return '审查'
  }
  const line = description.trim().split('\n')[0]?.trim() ?? ''
  if (!line) {
    return '子代理'
  }
  return line.length > 48 ? `${line.slice(0, 48)}…` : line
}

function subagentDescriptionBody(description: string): string {
  const lines = description.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length <= 1) {
    return ''
  }
  return lines.slice(1).join('\n').trim()
}

function deriveCurrentStep(
  subagent: AgentSubagentState,
  runActive: boolean,
): string | null {
  if (subagent.status === 'done' || subagent.status === 'failed') {
    return null
  }
  if (!runActive && subagent.status !== 'active') {
    return null
  }

  const openReasoning = [...subagent.logs]
    .reverse()
    .find((log) => log.phase === 'reasoning' && log.reasoningOpen)
  if (openReasoning) {
    return '思考中…'
  }

  const visible = visibleSubagentLogs(subagent.logs)
  const last = visible[visible.length - 1]
  if (last) {
    if (last.phase === 'turn') {
      return '编排中…'
    }
    if (last.phase === 'tool_started' || last.status === 'started') {
      return formatSubagentLogLabel(last)
    }
    if (last.phase === 'tool_done' || last.status === 'completed') {
      return formatSubagentLogLabel(last)
    }
    if (last.phase === 'error') {
      return last.title || '步骤失败'
    }
    const label = formatSubagentLogLabel(last)
    if (label) {
      return label
    }
  }

  if (subagent.thinkText?.trim()) {
    return '思考中…'
  }

  return runActive ? '启动中…' : null
}

export function deriveSubagentDisplayMeta(
  subagent: AgentSubagentState,
  runActive: boolean,
): SubagentDisplayMeta {
  const description = subagent.description.trim()
  const name = subagentNameFromDescription(description, subagent.kind)
  const body = subagentDescriptionBody(description)

  const statusKind: SubagentVisualStatus =
    subagent.status === 'failed'
      ? 'error'
      : subagent.status === 'done' && !runActive
        ? 'success'
        : 'loading'

  const statusLabel =
    subagent.status === 'failed'
      ? '失败'
      : subagent.status === 'done' && !runActive
        ? '已完成'
        : '运行中'

  const turnHint =
    typeof subagent.turn === 'number' &&
    subagent.turn > 0 &&
    subagent.maxTurns &&
    runActive
      ? `第 ${subagent.turn}/${subagent.maxTurns} 轮`
      : null

  const rawPreview = (subagent.summaryPreview ?? '').trim()
  const summaryBody =
    subagent.status === 'done' || subagent.status === 'failed'
      ? resolveSubagentSummaryBody(subagent.summaryPreview, description) || null
      : null
  const fullOutput = rawPreview || summaryBody
  const toolStats =
    subagent.status === 'done' || subagent.status === 'failed'
      ? formatSubagentToolStats(subagent.logs)
      : null

  return {
    name,
    description: body && body !== name ? body : '',
    statusKind,
    statusLabel,
    currentStep: deriveCurrentStep(subagent, runActive),
    turnHint,
    summaryBody,
    fullOutput: fullOutput || null,
    toolStats,
  }
}
