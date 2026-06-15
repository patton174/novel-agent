/**
 * 编排展示与 python-ai CC 工具集对齐。
 * SSE 事件名仍用 planning.*（表示一轮 bind_tools 编排）。
 */

import { toolDisplayName } from './agentLabels'
import { CC_ORCHESTRATION_TOOLS, normalizeToolName } from './agentToolNames'

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

/** 编排轮 transition 标题（与 python-ai planning_title / tool_display_name 对齐） */
export const PLANNING_PREP_TITLES: Record<string, string> = {
  Read: '读取',
  Write: '写入',
  Edit: '编辑',
  Glob: '列举',
  Grep: '搜索',
  Delete: '删除',
  AskUser: '整理待确认问题',
  TodoWrite: '更新任务',
  ToolSearch: '查找工具',
  WebFetch: '抓取网页',
  WebSearch: '网页搜索',
  EnterPlanMode: '计划模式',
  ExitPlanMode: '退出计划',
  Brief: '摘要',
  Skill: '技能',
  Agent: '子任务',
  TaskCreate: '创建任务',
  TaskGet: '查看任务',
  TaskList: '任务列表',
  TaskUpdate: '更新任务',
  TaskStop: '停止任务',
  NotebookEdit: '编辑笔记本',
  ListMcpResources: 'MCP 资源',
  ReadMcpResource: '读取 MCP',
  think: '分析任务',
  // legacy replay
  choose: '整理待确认问题',
  ask_user: '整理待确认问题',
  output: '整理回复',
  chapter_create: '写入',
  chapter_update: '编辑',
  chapter_list: '列举',
  chapter_read: '读取',
  chapter_delete: '删除',
  memory_patch: '编辑',
  memory_update: '编辑',
  memory_create: '写入',
  memory_read: '读取',
  memory_delete: '删除',
  context_search: '搜索',
}

export const PLANNING_GENERIC_TITLES = new Set([
  '',
  '规划中…',
  '规划中',
  '编排中…',
  '编排中',
  '编排完成',
  '正在调用编排模型…',
  '正在调用编排模型',
  '正在编排…',
  '正在编排',
  '工具执行',
  '后续步骤',
  '模型选择工具…',
  '调用模型编排…',
])

/** CC query_loop 每轮 planning.* 的标题：时间线展平为顶层工具行，不用 PlanningStack */
export const CC_FLAT_ORCHESTRATION_TITLES = new Set([
  ...PLANNING_GENERIC_TITLES,
  ...Object.values(PLANNING_PREP_TITLES),
  '根据你的选择继续…',
])

export function isCcFlatOrchestrationTitle(title: string | undefined): boolean {
  const raw = (title ?? '').trim()
  if (!raw) {
    return true
  }
  if (CC_FLAT_ORCHESTRATION_TITLES.has(raw)) {
    return true
  }
  return Object.values(PLANNING_PREP_TITLES).some(
    (prep) => raw === prep || raw.startsWith(`${prep}…`),
  )
}

export function planningPrepTitle(toolName: string | undefined): string {
  if (!toolName) {
    return '后续步骤'
  }
  const key = toolName.trim()
  return PLANNING_PREP_TITLES[key] ?? toolDisplayName(normalizeToolName(key))
}

export function planningTitleAfterInteraction(): string {
  return '根据你的选择继续…'
}

const PLANNING_ACTIVE_LABELS: Record<string, string> = {
  Read: '读取中…',
  Write: '写入中…',
  Edit: '编辑中…',
  Glob: '列举中…',
  Grep: '搜索中…',
  Delete: '删除中…',
  AskUser: '整理待确认问题…',
  TodoWrite: '更新任务…',
  ToolSearch: '查找工具…',
  WebFetch: '抓取网页…',
  WebSearch: '搜索网页…',
  EnterPlanMode: '计划模式…',
  ExitPlanMode: '退出计划…',
  think: '分析中…',
  memory_read: '查阅创作记忆…',
  memory_create: '写入记忆…',
  memory_update: '更新创作记忆…',
  memory_patch: '更新创作记忆…',
  memory_delete: '整理记忆条目…',
  WriteMemory: '写入记忆…',
  ReadMemory: '查阅记忆…',
  WriteChapter: '写入章节…',
  EditMemory: '更新创作记忆…',
  context_search: '检索相关设定…',
  chapter_list: '查阅章节目录…',
  chapter_read: '阅读章节…',
  choose: '准备创作方向…',
  ask_user: '整理待确认问题…',
  output: '整理回复…',
  chapter_create: '创建章节中…',
  chapter_update: '更新章节中…',
  chapter_delete: '整理章节…',
}

export function planningActiveLabel(toolName: string): string | undefined {
  const key = toolName.trim()
  return PLANNING_ACTIVE_LABELS[key] ?? PLANNING_ACTIVE_LABELS[normalizeToolName(key)]
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
  if (backendTitle && !PLANNING_GENERIC_TITLES.has(backendTitle)) {
    return backendTitle
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
        segments.push(`并行 · ${labels.join('、')}`)
      } else if (labels.length === 1) {
        segments.push(labels[0])
      } else {
        segments.push(labels.join('、'))
      }
    }
    if (segments.length === 1) {
      return segments[0]
    }
    if (segments.length > 1) {
      return segments.join(' → ')
    }
  }

  const tools = toolNamesFromPayload(payload).filter((t) => !isHiddenTimelineToolName(t))
  if (tools.length === 1) {
    return planningPrepTitle(tools[0])
  }
  if (tools.length > 1) {
    return tools.map((t) => planningPrepTitle(t)).join(' → ')
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
