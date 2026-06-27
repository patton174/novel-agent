import i18n from '@/i18n'
import { toolDisplayName } from './agentLabels'
import { CC_ORCHESTRATION_TOOLS, normalizeToolName } from './agentToolNames'
import {
  formatOrchestrationParallelBatch,
  formatOrchestrationSerialBatch,
  orchestrationLabelSeparator,
  translateOrchestrationBackendTitle,
} from './orchestrationI18n'

export { CC_ORCHESTRATION_TOOLS as ORCHESTRATION_TOOLS }

/** 不在时间线展示的内部/终态工具 */
export const HIDDEN_UI_TOOLS = new Set([
  'output',
  'end',
  'PlanResult',
  'StepResult',
  'Brief',
  'TodoWrite',
])

/** 历史回放可能仍出现的 step，不展示 */
export const LEGACY_HIDDEN_TOOLS = new Set(['orchestrator', 'plan', 'write_chapter'])

export function isHiddenUiTool(name: string | undefined): boolean {
  return Boolean(name && (HIDDEN_UI_TOOLS.has(name) || LEGACY_HIDDEN_TOOLS.has(name)))
}

export function isHiddenTimelineToolName(name: string): boolean {
  return HIDDEN_UI_TOOLS.has(name) || LEGACY_HIDDEN_TOOLS.has(name)
}

/** 执行轮 transition 标题（与 python-ai planning_title / tool_display_name 对齐） */
const PLANNING_PREP_OVERRIDE_KEYS = new Set([
  'AskUser',
  'TodoWrite',
  'think',
  'choose',
  'ask_user',
  'output',
])

const PLANNING_GENERIC_I18N_KEYS = [
  'editor:timeline.orchestrationActive',
  'editor:timeline.orchestrationDone',
  'editor:timeline.drafting',
  'editor:timeline.thinkingActive',
  'editor:agent.orchestration.nextSteps',
  'editor:agent.orchestration.afterInteraction',
  'editor:agent.orchestration.planningFailed',
  'editor:agent.timeline.executing',
] as const

/** Legacy SSE / persisted timeline titles (backend may still emit Chinese literals). */
const LEGACY_PLANNING_GENERIC_TITLES = new Set([
  '',
  '规划中…',
  '规划中',
  '执行中…',
  '执行中',
  '执行完成',
  '正在调用模型…',
  '正在调用模型',
  '正在执行…',
  '正在执行',
  '工具执行',
  '后续步骤',
  '模型选择工具…',
  '调用模型…',
  '编排中…',
  '编排中',
  '编排完成',
  '正在调用编排模型…',
  '正在调用编排模型',
  '正在编排…',
  '正在编排',
  '调用模型编排…',
])

export function isPlanningGenericTitle(title: string | undefined): boolean {
  const raw = (title ?? '').trim()
  if (!raw) {
    return true
  }
  if (LEGACY_PLANNING_GENERIC_TITLES.has(raw)) {
    return true
  }
  return PLANNING_GENERIC_I18N_KEYS.some((key) => matchesAnyLocale(key, raw))
}

function matchesAnyLocale(i18nKey: string, value: string): boolean {
  return ['zh', 'en'].some((lng) => i18n.t(i18nKey, { lng }) === value)
}

/** CC query_loop 每轮 planning.* 的标题：时间线展平为顶层工具行，不用 PlanningStack */
export function isCcFlatOrchestrationTitle(title: string | undefined): boolean {
  const raw = (title ?? '').trim()
  if (!raw) {
    return true
  }
  if (isPlanningGenericTitle(raw)) {
    return true
  }
  return CC_ORCHESTRATION_TOOLS.some((tool) => {
    const prep = planningPrepTitle(tool)
    return raw === prep || raw.startsWith(`${prep}…`)
  })
}

export function planningPrepTitle(toolName: string | undefined): string {
  if (!toolName) {
    return i18n.t('editor:agent.orchestration.nextSteps')
  }
  const key = toolName.trim()
  if (PLANNING_PREP_OVERRIDE_KEYS.has(key)) {
    const override = i18n.t(`editor:agent.orchestration.prep.${key}`, { defaultValue: '' })
    if (override) {
      return override
    }
  }
  return toolDisplayName(normalizeToolName(key))
}

export function planningTitleAfterInteraction(): string {
  return i18n.t('editor:agent.orchestration.afterInteraction')
}

export function planningActiveLabel(toolName: string): string | undefined {
  const key = toolName.trim()
  const direct = i18n.t(`editor:agent.orchestration.active.${key}`, { defaultValue: '' })
  if (direct) {
    return direct
  }
  const normalized = normalizeToolName(key)
  if (normalized !== key) {
    const viaNorm = i18n.t(`editor:agent.orchestration.active.${normalized}`, { defaultValue: '' })
    if (viaNorm) {
      return viaNorm
    }
  }
  return undefined
}

type ToolCallRow = { tool?: string; tool_call_id?: string; input?: Record<string, unknown> }
type PartitionRow = { parallel?: boolean; tools?: string[] }

export type PlannedToolCall = {
  tool: string
  toolCallId: string
  input?: Record<string, unknown>
}

/** 从 planning.completed payload 解析本轮计划工具（含 step_id = tool_call_id） */
export function plannedToolCallsFromPayload(
  payload: Record<string, unknown>,
  planStepId: string,
): PlannedToolCall[] {
  const raw = payload.tool_calls
  if (!Array.isArray(raw)) {
    return []
  }
  const out: PlannedToolCall[] = []
  for (let index = 0; index < raw.length; index += 1) {
    const row = raw[index]
    if (!row || typeof row !== 'object') {
      continue
    }
    const cell = row as ToolCallRow
    const tool = typeof cell.tool === 'string' ? cell.tool.trim() : ''
    if (!tool) {
      continue
    }
    const toolCallId =
      typeof cell.tool_call_id === 'string' && cell.tool_call_id.trim()
        ? cell.tool_call_id.trim()
        : `${planStepId}:tool:${index}`
    const input =
      cell.input && typeof cell.input === 'object' && !Array.isArray(cell.input)
        ? (cell.input as Record<string, unknown>)
        : undefined
    out.push({ tool, toolCallId, input })
  }
  return out
}

function toolNamesFromPayload(payload: Record<string, unknown>): string[] {
  const raw = payload.tool_calls
  if (!Array.isArray(raw)) {
    return []
  }
  const names: string[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') {
      continue
    }
    const tool = (row as ToolCallRow).tool
    if (typeof tool === 'string' && tool.trim()) {
      names.push(tool.trim())
    }
  }
  return names
}

function partitionFromPayload(payload: Record<string, unknown>): PartitionRow[] {
  const raw = payload.partition
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter((row): row is PartitionRow => Boolean(row && typeof row === 'object'))
}

/** 从 planning.completed payload 生成折叠标题（含并行/串行批次，类似 Cursor 工具批展示） */
export function orchestrationCompletedTitle(payload: Record<string, unknown>): string | undefined {
  const backendTitle =
    typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : ''
  if (backendTitle && !isPlanningGenericTitle(backendTitle)) {
    return translateOrchestrationBackendTitle(backendTitle)
  }

  if (payload.after_interaction === true) {
    return planningTitleAfterInteraction()
  }

  const partition = partitionFromPayload(payload)
  if (partition.length > 0) {
    const segments: string[] = []
    for (const batch of partition) {
      const tools = Array.isArray(batch.tools)
        ? batch.tools.filter((t): t is string => typeof t === 'string' && Boolean(t.trim()))
        : []
      const visible = tools.filter((t) => !isHiddenTimelineToolName(t))
      if (visible.length === 0) {
        continue
      }
      const labels = visible.map((t) => planningPrepTitle(t))
      if (batch.parallel && labels.length > 1) {
        segments.push(formatOrchestrationParallelBatch(labels))
      } else if (labels.length === 1) {
        segments.push(labels[0])
      } else {
        segments.push(labels.join(orchestrationLabelSeparator()))
      }
    }
    if (segments.length === 1) {
      return segments[0]
    }
    if (segments.length > 1) {
      return formatOrchestrationSerialBatch(segments)
    }
  }

  const tools = toolNamesFromPayload(payload).filter((t) => !isHiddenTimelineToolName(t))
  if (tools.length === 1) {
    return planningPrepTitle(tools[0])
  }
  if (tools.length > 1) {
    return formatOrchestrationSerialBatch(tools.map((t) => planningPrepTitle(t)))
  }

  const nextTool =
    typeof payload.next_tool === 'string' && payload.next_tool.trim()
      ? payload.next_tool.trim()
      : ''
  if (nextTool && !isHiddenTimelineToolName(nextTool)) {
    return planningPrepTitle(nextTool)
  }

  return backendTitle || undefined
}
