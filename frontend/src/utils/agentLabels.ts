import { normalizeToolName } from './agentToolNames'

/** CC tool name -> display label */

const TOOL_LABELS: Record<string, string> = {
  Read: '读取',
  Write: '写入',
  Edit: '编辑',
  Glob: '列举',
  Grep: '搜索',
  Delete: '删除',
  AskUser: '询问',
  TodoWrite: '任务',
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
  single_select: '单选',
  multi_select: '多选',
  user_input: '输入',
}

const LEGACY_LABELS: Record<string, string> = {
  chapter_list: '列举章节',
  chapter_read: '阅读章节',
  chapter_create: '写入章节',
  chapter_update: '编辑章节',
  chapter_delete: '删除章节',
  memory_read: '查阅记忆',
  memory_create: '写入记忆',
  memory_update: '编辑记忆',
  memory_delete: '删除记忆',
  memory_patch: '编辑记忆',
  choose: '询问',
  ask_user: '询问',
  output: '回复',
  context_search: '搜索',
}

export function toolDisplayName(name: string): string {
  const raw = (name ?? '').trim()
  if (!raw) {
    return '工具'
  }
  if (LEGACY_LABELS[raw]) {
    return LEGACY_LABELS[raw]
  }
  const canonical = normalizeToolName(raw)
  return TOOL_LABELS[canonical] ?? TOOL_LABELS[raw] ?? raw
}

export function chapterWriteProgressLabel(
  title?: string,
  toolName?: string,
): string {
  const isEdit = normalizeToolName(toolName) === 'Edit'
  const verb = isEdit ? '编辑' : '编写'
  const raw = (title ?? '').trim()
  if (!raw || raw === '章节') {
    return isEdit ? '正在编辑章节…' : '正在编写章节…'
  }
  const cleaned = raw.replace(/^(Write|写入|Edit|编辑)$/i, '').trim()
  if (!cleaned) {
    return isEdit ? '正在编辑章节…' : '正在编写章节…'
  }
  if (cleaned.startsWith('《')) {
    return `正在${verb}章节${cleaned}`
  }
  if (cleaned.startsWith('正在')) {
    return cleaned
  }
  return `正在${verb}章节《${cleaned}》`
}

export function stepStatusLabel(status: 'started' | 'completed' | 'failed'): string {
  if (status === 'failed') {
    return '失败'
  }
  if (status === 'started') {
    return ''
  }
  return ''
}
