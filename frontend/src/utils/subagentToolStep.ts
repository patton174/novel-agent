import type { AgentStepState, AgentSubagentLogEntry } from '../types/agent'
import { ccToolNameLabel } from './ccToolDisplay'
import { normalizeToolName, vfsPathFromPayload } from './agentToolNames'
import { visibleSubagentLogs } from './subagentLogLabel'

function childKeyFromLogId(id: string): string {
  return id.replace(/^tool_(?:started|done):/, '')
}

function chapterTitleFromExcerpt(excerpt?: string): string[] | undefined {
  const raw = (excerpt || '').trim()
  const m = raw.match(/^《([^》]+)》/)
  if (!m) {
    return undefined
  }
  return [`《${m[1]}》`]
}

/** Merge tool.started path/meta into tool_done rows (same child_step_id). */
export function enrichSubagentToolLogs(
  logs: AgentSubagentLogEntry[],
): AgentSubagentLogEntry[] {
  const startedByChild = new Map<string, AgentSubagentLogEntry>()
  for (const log of logs) {
    if (log.phase === 'tool_started') {
      startedByChild.set(childKeyFromLogId(log.id), log)
    }
  }

  return visibleSubagentLogs(logs).map((entry) => {
    const started = startedByChild.get(childKeyFromLogId(entry.id))
    const filePath =
      entry.filePath ||
      started?.filePath ||
      vfsPathFromPayload(entry.toolInput) ||
      vfsPathFromPayload(started?.toolInput) ||
      undefined
    const toolInput = entry.toolInput ?? started?.toolInput
    const resultLabels =
      entry.resultLabels?.length
        ? entry.resultLabels
        : started?.resultLabels?.length
          ? started.resultLabels
          : chapterTitleFromExcerpt(entry.excerpt)
    const displayName = entry.displayName || started?.displayName || entry.title

    return {
      ...entry,
      filePath,
      toolInput,
      resultLabels,
      displayName,
    }
  })
}

/** 转为与主时间线相同的 AgentStepState，供 TimelineToolBlock 渲染。 */
export function subagentLogToStep(
  entry: AgentSubagentLogEntry,
  rowStatus: 'loading' | 'success' | 'error' | 'idle',
): AgentStepState {
  const tool = normalizeToolName(entry.tool || '') || entry.tool || 'tool'
  const toolInput =
    entry.toolInput ||
    (entry.filePath ? { file_path: entry.filePath } : undefined)
  const draft: AgentStepState = {
    stepId: entry.id,
    type: 'tool',
    status:
      rowStatus === 'loading'
        ? 'started'
        : rowStatus === 'error'
          ? 'failed'
          : 'completed',
    title: entry.displayName || entry.title || tool,
    toolName: tool,
    toolInput,
    resultLabels: entry.resultLabels,
    outputSummary: entry.excerpt,
    displayExcerpt: entry.excerpt,
    detail: entry.excerpt,
  }

  return {
    ...draft,
    title: ccToolNameLabel(draft),
  }
}
