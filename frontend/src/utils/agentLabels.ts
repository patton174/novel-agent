import i18n from '@/i18n'
import { normalizeToolName } from './agentToolNames'

/** CC tool name -> display label */

const CC_TOOL_LABELS: Record<string, string> = {
  ReadMemory: '查阅记忆',
  GetMemoryTree: '记忆树',
  CreateMemory: '创建记忆',
  UpdateMemoryFields: '更新记忆属性',
  UpdateMemoryContent: '更新记忆正文',
  UpdateMemoryMeta: '更新记忆元数据',
  MoveMemory: '移动记忆',
  DeleteMemory: '删除记忆',
  ListMemory: '列举记忆',
  ReadChapter: '阅读章节',
  WriteChapter: '写入章节',
  EditChapter: '编辑章节',
  DeleteChapter: '删除章节',
  ListChapters: '列举章节',
  ChapterAudit: '章节目录审计',
  NarrativeReview: '叙事审查',
  ReorderChapters: '调整章节顺序',
  SearchKnowledge: '知识检索',
  GetCharacterGraph: '角色关系图',
  Write: '写入',
  Read: '读取',
  Edit: '编辑',
  Delete: '删除',
  Glob: '列举',
  Grep: '搜索',
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
  choose: '询问',
  ask_user: '询问',
  output: '回复',
}

function localizedLabel(zhKey: string): string {
  return i18n.t(`editor:tools.${zhKey}`, { defaultValue: zhKey })
}

export function toolDisplayName(name: string): string {
  const raw = (name ?? '').trim()
  if (!raw) {
    return localizedLabel('工具')
  }
  if (CC_TOOL_LABELS[raw]) {
    return localizedLabel(CC_TOOL_LABELS[raw])
  }
  if (LEGACY_LABELS[raw]) {
    return localizedLabel(LEGACY_LABELS[raw])
  }
  const canonical = normalizeToolName(raw)
  if (canonical !== raw && CC_TOOL_LABELS[canonical]) {
    return localizedLabel(CC_TOOL_LABELS[canonical])
  }
  const zh = TOOL_LABELS[canonical] ?? TOOL_LABELS[raw]
  if (zh) {
    return localizedLabel(zh)
  }
  return raw
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
