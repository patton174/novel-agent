import type { AgentSubagentLogEntry, AgentSubagentState } from '../types/agent'
import { isMemoryVfsPath, normalizeToolName } from './agentToolNames'
import { formatSubagentLogLabel, visibleSubagentLogs } from './subagentLogLabel'

type ToolCounts = {
  readChapters: number
  readMemory: number
  writeChapters: number
  writeMemory: number
  editChapters: number
  editMemory: number
  glob: number
  grep: number
  deleteCount: number
}

function bumpToolCounts(counts: ToolCounts, log: AgentSubagentLogEntry): void {
  if (log.phase !== 'tool_done' && log.status !== 'completed') {
    return
  }
  const tool = normalizeToolName(log.tool || '')
  const path = log.filePath ?? ''
  const chapter = /\/chapters\//i.test(path) || /章节|chapter/i.test(log.title || '')
  const memory = isMemoryVfsPath(path) || /记忆|memory/i.test(log.title || '')

  if (tool === 'Read') {
    if (memory) {
      counts.readMemory += 1
    } else if (chapter) {
      counts.readChapters += 1
    } else {
      counts.readChapters += 1
    }
    return
  }
  if (tool === 'Write') {
    if (memory) {
      counts.writeMemory += 1
    } else {
      counts.writeChapters += 1
    }
    return
  }
  if (tool === 'Edit') {
    if (memory) {
      counts.editMemory += 1
    } else {
      counts.editChapters += 1
    }
    return
  }
  if (tool === 'Glob') {
    counts.glob += 1
    return
  }
  if (tool === 'Grep') {
    counts.grep += 1
    return
  }
  if (tool === 'Delete') {
    counts.deleteCount += 1
  }
}

/** Cursor 风格工具统计，完成后跟在标题后（灰色） */
export function formatSubagentToolStats(logs: AgentSubagentLogEntry[]): string | null {
  const counts: ToolCounts = {
    readChapters: 0,
    readMemory: 0,
    writeChapters: 0,
    writeMemory: 0,
    editChapters: 0,
    editMemory: 0,
    glob: 0,
    grep: 0,
    deleteCount: 0,
  }

  for (const log of logs) {
    bumpToolCounts(counts, log)
  }

  const parts: string[] = []
  if (counts.readChapters > 0) {
    parts.push(`阅读 ${counts.readChapters} 章`)
  }
  if (counts.readMemory > 0) {
    parts.push(`查阅记忆 ${counts.readMemory} 次`)
  }
  if (counts.writeChapters > 0) {
    parts.push(`写入 ${counts.writeChapters} 章`)
  }
  if (counts.writeMemory > 0) {
    parts.push(`写入记忆 ${counts.writeMemory} 次`)
  }
  if (counts.editChapters > 0) {
    parts.push(`编辑 ${counts.editChapters} 章`)
  }
  if (counts.editMemory > 0) {
    parts.push(`编辑记忆 ${counts.editMemory} 次`)
  }
  if (counts.glob > 0) {
    parts.push(`列举 ${counts.glob} 次`)
  }
  if (counts.grep > 0) {
    parts.push(`搜索 ${counts.grep} 次`)
  }
  if (counts.deleteCount > 0) {
    parts.push(`删除 ${counts.deleteCount} 项`)
  }

  return parts.length > 0 ? parts.join('，') : null
}

function liveLineForLog(log: AgentSubagentLogEntry): string {
  const label = formatSubagentLogLabel(log)
  const hint =
    log.resultLabels?.[0]?.trim() ||
    log.displayName?.trim() ||
    (log.excerpt?.trim() ? log.excerpt.trim().slice(0, 48) : '')
  if (hint && !label.includes(hint.slice(0, 8))) {
    return `${label} · ${hint}`
  }
  return label
}

/** 运行中动态行（最多保留最近若干条，供 3 行窗口滚动） */
export function deriveSubagentLiveLines(
  subagent: AgentSubagentState,
  runActive: boolean,
): string[] {
  if (!runActive) {
    return []
  }

  const lines: string[] = []

  const thinkTail = subagent.thinkText?.trim()
  if (thinkTail) {
    const tailLines = thinkTail.split('\n').map((l) => l.trim()).filter(Boolean)
    const lastThink = tailLines[tailLines.length - 1]
    if (lastThink) {
      lines.push(lastThink.length > 120 ? `${lastThink.slice(0, 120)}…` : lastThink)
    }
  }

  const childSteps = subagent.childStepStates ?? []
  if (childSteps.length > 0) {
    for (const step of childSteps) {
      if (step.status !== 'started' && step.status !== 'completed') {
        continue
      }
      const hint =
        step.resultLabels?.[0]?.trim() ||
        step.displayExcerpt?.trim() ||
        step.outputSummary?.trim() ||
        step.toolArgs?.trim() ||
        step.title?.trim()
      const label = step.title?.trim() || step.toolName || '工具'
      if (hint && !label.includes(hint.slice(0, 8))) {
        lines.push(`${label} · ${hint.slice(0, 48)}`)
      } else {
        lines.push(label)
      }
    }
  } else {
    for (const log of visibleSubagentLogs(subagent.logs)) {
      if (log.phase === 'error') {
        lines.push(log.title || '步骤失败')
        continue
      }
      if (log.phase === 'tool_started' || log.phase === 'tool_done') {
        lines.push(liveLineForLog(log))
      }
    }
  }

  const timeline = subagent.timeline ?? []
  if (timeline.length > 0) {
    const openText = timeline
      .filter((block) => block.kind === 'text' && !block.frozen)
      .map((block) => block.content.trim())
      .filter(Boolean)
      .join('\n')
    if (openText) {
      const tailLines = openText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      for (const line of tailLines.slice(-2)) {
        lines.push(line.length > 120 ? `${line.slice(0, 120)}…` : line)
      }
    }
  } else {
    const outputPreview = subagent.summaryPreview?.trim()
    if (outputPreview) {
      const tailLines = outputPreview
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      for (const line of tailLines.slice(-3)) {
        lines.push(line.length > 120 ? `${line.slice(0, 120)}…` : line)
      }
    }
  }

  const openReasoning = subagent.logs.some((l) => l.phase === 'reasoning' && l.reasoningOpen)
  if (openReasoning && lines[lines.length - 1] !== '执行中…') {
    lines.push('执行中…')
  }

  const deduped: string[] = []
  for (const line of lines) {
    if (deduped[deduped.length - 1] !== line) {
      deduped.push(line)
    }
  }

  return deduped.slice(-12)
}
