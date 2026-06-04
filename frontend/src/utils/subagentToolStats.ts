import type { AgentSubagentLogEntry } from '../types/agent'
import { normalizeToolName } from './agentToolNames'

/** 完成后灰色工具统计，如「阅读 4 章，写入 2 章」 */
export function deriveSubagentToolStats(logs: AgentSubagentLogEntry[]): string | null {
  const counts = new Map<string, number>()

  for (const log of logs) {
    if (log.phase !== 'tool_done') {
      continue
    }
    const tool = normalizeToolName(log.tool || '')
    if (!tool) {
      continue
    }
    counts.set(tool, (counts.get(tool) ?? 0) + 1)
  }

  if (counts.size === 0) {
    return null
  }

  const parts: string[] = []
  const read = counts.get('Read') ?? 0
  const write = (counts.get('Write') ?? 0) + (counts.get('Edit') ?? 0)
  const glob = counts.get('Glob') ?? 0
  const grep = counts.get('Grep') ?? 0
  const agent = counts.get('Agent') ?? 0

  if (read > 0) {
    parts.push(`阅读 ${read} 章`)
  }
  if (write > 0) {
    parts.push(`写入 ${write} 章`)
  }
  if (glob > 0) {
    parts.push(`列举 ${glob} 次`)
  }
  if (grep > 0) {
    parts.push(`搜索 ${grep} 次`)
  }
  if (agent > 0) {
    parts.push(`子任务 ${agent} 个`)
  }

  for (const [tool, count] of counts) {
    if (['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Agent'].includes(tool)) {
      continue
    }
    if (count > 0) {
      parts.push(`${tool} ${count} 次`)
    }
  }

  return parts.length > 0 ? parts.join('，') : null
}
