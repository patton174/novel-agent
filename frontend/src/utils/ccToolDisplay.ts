import { translateToolDisplayName } from './orchestrationI18n'
import type { AgentStepState } from '../types/agent'
import { toolDisplayName } from './agentLabels'
import i18n from '@/i18n'
import { isCompactToolResultText } from './toolDetailFormat'
import { resolveToolTitle } from './toolTitleI18n'
import {
  isCollapsibleReadTool,
  isMemoryVfsPath,
  normalizeToolName,
  vfsPathFromPayload,
} from './agentToolNames'

const GENERIC_TOOL_LABELS = new Set([
  '读取',
  '写入',
  '编辑',
  '列举',
  '搜索',
  '删除',
  '工具',
])

const CHAPTER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MEMORY_SCOPE_LABELS: Record<string, string> = {
  characters: '角色库',
  character: '角色库',
  world: '世界观',
  worldview: '世界观',
  background: '背景设定',
  novel: '作品设定',
  chapter: '章节记忆',
  chapters: '章节记忆',
  story: '故事记忆',
  plot: '情节记忆',
  style: '文风',
  outline: '大纲',
}

/** Short path for internal/debug only. */
export function shortenVfsPath(path: string): string {
  const normalized = path.replace(/\\/g, '/').trim()
  if (!normalized) {
    return ''
  }
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 2) {
    return parts.join('/') || normalized
  }
  return parts.slice(-2).join('/')
}

function pathFromStep(step: AgentStepState): string {
  const fromInput = step.toolInput
    ? vfsPathFromPayload(step.toolInput as Record<string, unknown>)
    : ''
  if (fromInput) {
    return fromInput
  }
  if (step.toolArgs?.trim() && !step.toolArgs.includes('{')) {
    const raw = step.toolArgs.trim()
    if (raw.startsWith('/') || raw.includes('/')) {
      return raw.startsWith('/') ? raw : `/${raw}`
    }
  }
  const detail = step.detail?.trim() ?? ''
  if (detail.startsWith('/')) {
    return detail
  }
  return ''
}

/** Align with python cc_visibility.tool_display_name when SSE title is generic. */
function ccToolNameFromPath(tool: string, path: string): string | undefined {
  if (tool === 'Read' && path) {
    if (isMemoryVfsPath(path)) {
      return '查阅创作记忆'
    }
    if (path.includes('/chapters')) {
      return '阅读章节'
    }
  }
  if (tool === 'Write' && path.includes('/chapters')) {
    if (path.includes('index.json')) {
      return '写入章节目录'
    }
    return '写入章节'
  }
  if (tool === 'Write' && isMemoryVfsPath(path)) {
    return '写入创作记忆'
  }
  if (tool === 'Edit' && isMemoryVfsPath(path)) {
    return '编辑创作记忆'
  }
  if (tool === 'Delete' && isMemoryVfsPath(path)) {
    return '删除创作记忆'
  }
  if (tool === 'Glob' && (path.includes('/chapters') || path.includes('chapter'))) {
    return '查阅章节目录'
  }
  return undefined
}

function pathFromPayload(payload: Record<string, unknown> | undefined): string {
  return vfsPathFromPayload(payload)
}

function memoryScopeLabel(scope: string): string {
  const key = scope.toLowerCase()
  return MEMORY_SCOPE_LABELS[key] ?? `记忆·${scope}`
}

function decodeMemoryKeySegment(segment: string): string {
  const raw = (segment || '').replace(/\.json$/i, '').trim()
  if (!raw) {
    return ''
  }
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function memoryPathHint(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const chapterMem = normalized.match(/\/memory\/chapter\/([^/]+?)\.json$/i)
  if (chapterMem) {
    const key = decodeMemoryKeySegment(chapterMem[1])
    if (key && !CHAPTER_ID_RE.test(key)) {
      return `章节记忆：${key}`
    }
    return ''
  }
  const m = normalized.match(/\/memory\/([^/]+)(?:\/([^/]+?))?(?:\.json)?$/i)
  if (!m) {
    return '创作记忆'
  }
  const scope = m[1] ?? ''
  const key = decodeMemoryKeySegment(m[2] ?? '')
  const scopeLabel = memoryScopeLabel(scope)
  if (key && !CHAPTER_ID_RE.test(key)) {
    return `${scopeLabel}：${key}`
  }
  if (scope === 'chapter') {
    return ''
  }
  return scopeLabel
}

function chapterPathHint(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  if (normalized.includes('index.json')) {
    return '章节目录'
  }
  const m = normalized.match(/\/chapters\/([^/]+?)\.md$/i)
  if (m) {
    const cid = m[1]
    if (cid === '_new') {
      return '新章节'
    }
    if (CHAPTER_ID_RE.test(cid)) {
      return '章节正文'
    }
    return `章节：${cid}`
  }
  if (/\/chapters\/?$/i.test(normalized)) {
    return '章节目录'
  }
  return '章节'
}

function novelRootHint(path: string): string {
  const normalized = path.replace(/\\/g, '/').trim()
  if (!normalized) {
    return '本书目录'
  }
  if (/\/novel\/[^/]+\/?$/i.test(normalized)) {
    return '本书目录'
  }
  if (normalized.endsWith('/meta.json')) {
    return '作品信息'
  }
  if (normalized.includes('/outline/')) {
    return '创作大纲'
  }
  return '本书目录'
}

function globPatternHint(pattern: string, path: string): string {
  const p = pattern.trim().toLowerCase()
  const base = path.replace(/\\/g, '/')
  if (p.includes('memory') || base.includes('/memory')) {
    return '创作记忆库'
  }
  if (p.includes('chapter') || base.includes('/chapters')) {
    return '作品库章节'
  }
  if (p === '*' || p === '**/*') {
    return novelRootHint(base)
  }
  return '文件匹配'
}

function grepHint(path: string, pattern?: string): string {
  if (isMemoryVfsPath(path)) {
    return pattern?.trim() ? `记忆：${pattern.trim().slice(0, 32)}` : '检索创作记忆'
  }
  return pattern?.trim() ? `章节：${pattern.trim().slice(0, 32)}` : '检索章节'
}

/** 用户可见的工具副标题（中文，不展示 novel UUID） */
export function ccToolHumanSubtitle(
  toolName: string | undefined,
  opts?: {
    path?: string
    pattern?: string
    resultLabels?: string[]
    outputSummary?: string
  },
): string {
  const tool = normalizeToolName(toolName)
  const path = (opts?.path ?? '').trim()
  const pattern = typeof opts?.pattern === 'string' ? opts.pattern.trim() : ''

  if (opts?.resultLabels?.length) {
    const tool = normalizeToolName(toolName)
    if (tool === 'Write' || tool === 'Edit' || tool === 'Delete') {
      return ''
    }
    return opts.resultLabels.join('、')
  }

  if (tool === 'Glob') {
    if (pattern) {
      return globPatternHint(pattern, path)
    }
    if (path) {
      if (isMemoryVfsPath(path)) {
        return '创作记忆库'
      }
      if (path.includes('/chapters')) {
        return '作品库章节'
      }
      return novelRootHint(path)
    }
    return '列举文件'
  }

  if (tool === 'Read') {
    if (path) {
      if (isMemoryVfsPath(path)) {
        return memoryPathHint(path)
      }
      if (path.includes('/chapters')) {
        return chapterPathHint(path)
      }
      if (path.includes('meta.json')) {
        return '作品信息'
      }
      if (path.includes('/outline/')) {
        return '创作大纲'
      }
    }
    return '读取内容'
  }

  if (tool === 'Write') {
    if (path.includes('/chapters')) {
      return '写入章节'
    }
    if (isMemoryVfsPath(path)) {
      return memoryPathHint(path)
    }
    return '写入文件'
  }

  if (tool === 'Edit') {
    if (path.includes('/chapters')) {
      return '编辑章节'
    }
    if (isMemoryVfsPath(path)) {
      return memoryPathHint(path)
    }
    return '编辑文件'
  }

  if (tool === 'Delete') {
    if (path.includes('/chapters')) {
      return '删除章节'
    }
    if (isMemoryVfsPath(path)) {
      return memoryPathHint(path)
    }
    return '删除文件'
  }

  if (tool === 'Grep') {
    return grepHint(path, pattern)
  }

  if (tool === 'AskUser') {
    return '等待你的回复'
  }

  if (tool === 'TodoWrite') {
    return ''
  }

  if (tool === 'WebFetch') {
    return '抓取网页'
  }

  if (tool === 'WebSearch') {
    return pattern ? `搜索：${pattern.slice(0, 28)}` : '网页搜索'
  }

  if (tool === 'Skill') {
    return '调用技能'
  }

  if (tool === 'Agent') {
    return ''
  }

  if (tool.startsWith('Task')) {
    return '任务管理'
  }

  if (tool === 'ToolSearch') {
    return '查找工具'
  }

  if (tool === 'EnterPlanMode' || tool === 'ExitPlanMode') {
    return '计划模式'
  }

  if (tool === 'NotebookEdit') {
    return '编辑笔记本'
  }

  if (tool === 'ListMcpResources' || tool === 'ReadMcpResource') {
    return 'MCP 资源'
  }

  const summary = opts?.outputSummary?.trim()
  if (summary && summary.length < 48 && !summary.startsWith('/novel/')) {
    return summary
  }

  return ''
}

export function ccToolHumanSubtitleFromPayload(
  toolName: string | undefined,
  payload: Record<string, unknown> | undefined,
): string {
  const path = pathFromPayload(payload)
  const pattern =
    typeof payload?.pattern === 'string'
      ? payload.pattern
      : typeof payload?.glob_pattern === 'string'
        ? payload.glob_pattern
        : ''
  return ccToolHumanSubtitle(toolName, { path, pattern })
}

function titleFromMemoryReadExcerpt(excerpt?: string): string | undefined {
  const text = (excerpt || '').trim()
  if (!text) {
    return undefined
  }
  const heading = text.match(/^#\s*(第\s*\d+\s*章[^#\n]+)/m)
  if (heading) {
    return heading[1].trim().replace(/\s*摘要\s*$/, '')
  }
  const book = text.match(/《([^》]+)》/)
  if (book) {
    return `《${book[1]}》`
  }
  return undefined
}

/** Branch labels under Read — never show raw chapter_id UUID. */
export function readToolBranchLabels(step: AgentStepState): string[] | null {
  const path = pathFromStep(step)
  const cleaned =
    step.resultLabels
      ?.map((l) => l.trim())
      .filter((l) => l && !CHAPTER_ID_RE.test(l)) ?? []
  if (cleaned.length > 0) {
    return cleaned
  }
  const fromExcerpt = titleFromMemoryReadExcerpt(
    step.outputSummary || step.displayExcerpt || step.detail,
  )
  if (fromExcerpt && fromExcerpt !== '（空）' && fromExcerpt !== '空章节' && fromExcerpt !== '已读取') {
    return [fromExcerpt]
  }
  if (path.includes('/memory/chapter/') && CHAPTER_ID_RE.test(path)) {
    return null
  }
  return null
}

export function ccToolHumanSubtitleFromStep(step: AgentStepState): string {
  const path = pathFromStep(step)
  return ccToolHumanSubtitle(step.toolName, {
    path,
    resultLabels: step.resultLabels,
    outputSummary: step.outputSummary,
  })
}

/** User-facing tool label (bold segment in CC). */
export function ccToolNameLabel(step: AgentStepState): string {
  const rawTool = (step.toolName ?? '').trim()
  const fromWire = rawTool ? toolDisplayName(rawTool) : translateToolDisplayName('工具')
  const raw = normalizeToolName(step.toolName) || rawTool
  const generic = raw ? toolDisplayName(raw) : fromWire
  const title = step.title?.trim() ?? ''
  const path = pathFromStep(step)

  if (title && (title === rawTool || title === raw) && fromWire) {
    return fromWire
  }

  if (title && !GENERIC_TOOL_LABELS.has(title) && title !== generic) {
    const viaTitle = toolDisplayName(title)
    if (viaTitle !== title) {
      return viaTitle
    }
    return translateToolDisplayName(title)
  }

  if (raw) {
    const fromPath = path ? ccToolNameFromPath(raw, path) : undefined
    if (fromPath) {
      return translateToolDisplayName(fromPath)
    }
    if (title) {
      return translateToolDisplayName(title)
    }
    return generic
  }

  const paren = title.indexOf('(')
  if (paren > 0) {
    return translateToolDisplayName(title.slice(0, paren).trim())
  }
  return title ? translateToolDisplayName(title) : translateToolDisplayName('工具')
}

function isMutationResultInBranch(step: AgentStepState): boolean {
  const tool = normalizeToolName(step.toolName)
  if (tool !== 'Write' && tool !== 'Edit' && tool !== 'Delete') {
    return false
  }
  if (step.status !== 'completed' && step.status !== 'failed') {
    return false
  }
  return Boolean(step.outputSummary?.trim() || step.resultLabels?.length)
}

export function ccToolArgsSubtitle(step: AgentStepState): string {
  if (normalizeToolName(step.toolName) === 'Agent') {
    const fromInput =
      typeof step.toolInput?.description === 'string'
        ? step.toolInput.description.trim()
        : ''
    const desc = fromInput || step.subagent?.description?.trim() || ''
    if (!desc) {
      return ''
    }
    return desc.length > 48 ? `${desc.slice(0, 48)}…` : desc
  }
  if (normalizeToolName(step.toolName) === 'TodoWrite') {
    if (step.todos?.length) {
      return `${step.todos.length} 项`
    }
    return ''
  }
  if (step.resultLabels?.length && isCollapsibleReadTool(step.toolName)) {
    return ''
  }
  if (isMutationResultInBranch(step)) {
    return ''
  }
  const human = ccToolHumanSubtitleFromStep(step)
  if (human) {
    return human
  }
  if (step.toolArgs?.trim()) {
    const raw = step.toolArgs.trim()
    if (!CHAPTER_ID_RE.test(raw) && !raw.includes('/novel/')) {
      return raw
    }
  }
  return ''
}

/** 完成后标题行灰色摘要：干了什么（始终可见，详情仍可点击展开） */
export function ccToolResultHint(
  step: AgentStepState,
  ctx: {
    readLabel?: string | null
    deleteSummary?: string | null
    chapterResultSummary?: string | null
    memoryActionLabel?: string | null
    loading?: boolean
  },
): string | null {
  if (ctx.loading) {
    return null
  }

  const compact =
    ctx.readLabel?.trim() ||
    ctx.chapterResultSummary?.trim() ||
    ctx.deleteSummary?.trim() ||
    ctx.memoryActionLabel?.trim() ||
    ''
  if (compact) {
    return compact.length > 96 ? `${compact.slice(0, 96)}…` : compact
  }

  if (step.status !== 'completed' && step.status !== 'failed') {
    return null
  }

  const tool = normalizeToolName(step.toolName)
  const raw =
    step.resultLabels?.filter(Boolean).join('、').trim() ||
    step.outputSummary?.trim().split('\n')[0]?.trim() ||
    step.detail?.trim().split('\n')[0]?.trim() ||
    ''

  if (!raw) {
    return null
  }

  if (tool === 'Glob' || tool === 'Grep' || tool === 'Write' || tool === 'Edit') {
    return raw.length > 96 ? `${raw.slice(0, 96)}…` : raw
  }

  return null
}

/** 工具标题行内联结果：只展示产出/摘要，不含「已读取」等动作文案 */
export function ccToolInlineResult(
  step: AgentStepState,
  options: {
    loading: boolean
    error: boolean
    readLabel?: string | null
    chapterProgressHint?: string | null
    readProgressHint?: string | null
    earlyProgressHint?: string | null
    awaitingUserInput?: boolean
    chooseLoading?: boolean
    toolErrorText?: string | null
  },
): string | null {
  if (options.chooseLoading) {
    return null
  }

  if (options.loading) {
    return null
  }

  if (options.error) {
    const err = options.toolErrorText?.trim() || step.outputSummary?.trim() || ''
    if (!err || err.startsWith('{') || /tool_use_error|upstream_/i.test(err)) {
      return null
    }
    return err.length > 96 ? `${err.slice(0, 96)}…` : err
  }

  if (options.awaitingUserInput) {
    return null
  }

  const compact =
    step.displayExcerpt?.trim() ||
    step.outputSummary?.trim() ||
    step.resultLabels?.[0]?.trim() ||
    ''
  if (isCompactToolResultText(compact)) {
    return compact.length > 96 ? `${compact.slice(0, 96)}…` : compact
  }

  const idleLabel = options.readLabel?.trim() || ''
  if (idleLabel && idleLabel !== '（空）' && idleLabel !== compact) {
    return idleLabel.length > 96 ? `${idleLabel.slice(0, 96)}…` : idleLabel
  }

  return null
}

/** 工具行树状分支文案：运行中「正在…」/ 完成后「已…」 */
export function ccToolBranchStatus(
  step: AgentStepState,
  options: {
    loading: boolean
    error: boolean
    phase?: string
    readLabel?: string | null
    chapterProgressHint?: string | null
    readProgressHint?: string | null
    earlyProgressHint?: string | null
    awaitingUserInput?: boolean
    chooseLoading?: boolean
  },
): string {
  const iconName = step.toolName ?? 'Tool'
  const { loading, error } = options

  if (options.chooseLoading) {
    return '正在生成选项…'
  }

  if (loading) {
    return ''
  }

  if (error) {
    const failed = resolveToolTitle(iconName, 'failed')
    if (failed.hasPhaseTitle) {
      return failed.title
    }
    return i18n.t('editor:timeline.phaseFailed')
  }

  if (options.awaitingUserInput) {
    const awaiting = resolveToolTitle(iconName, 'awaiting')
    if (awaiting.hasPhaseTitle) {
      return awaiting.title
    }
    return i18n.t('editor:timeline.phaseAwaiting')
  }

  const compactOutcome =
    step.displayExcerpt?.trim() ||
    step.outputSummary?.trim() ||
    step.resultLabels?.[0]?.trim() ||
    ''
  if (isCompactToolResultText(compactOutcome)) {
    return compactOutcome.length > 96 ? `${compactOutcome.slice(0, 96)}…` : compactOutcome
  }

  const done = resolveToolTitle(iconName, 'done')
  if (done.hasPhaseTitle) {
    return done.title
  }
  return i18n.t('editor:timeline.phaseDone')
}
