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

const GENERIC_TOOL_NAMES = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Delete', '_default'] as const

function tTool(labelKey: string): string {
  return i18n.t(`editor:tools.${labelKey}`, { defaultValue: labelKey })
}

function tPathAction(actionKey: string): string {
  return i18n.t(`editor:tools.pathActions.${actionKey}`)
}

function matchesAnyLocaleExcerpt(key: string, value: string): boolean {
  return ['zh', 'en'].some((lng) => i18n.t(`editor:sseExcerpts.${key}`, { lng }) === value)
}

function isGenericToolLabel(title: string): boolean {
  const trimmed = title.trim()
  if (!trimmed) {
    return false
  }
  return GENERIC_TOOL_NAMES.some((key) => {
    const label =
      key === '_default'
        ? i18n.t('editor:tools.byName._default')
        : toolDisplayName(key)
    return trimmed === label
  })
}

const CHAPTER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function tCcDisplay(key: string, options?: Record<string, string | number>): string {
  return i18n.t(`editor:agent.ccDisplay.${key}`, options)
}

function isIgnoredReadResultLabel(label: string): boolean {
  const trimmed = label.trim()
  if (!trimmed) {
    return true
  }
  return (['empty', 'emptyChapter', 'alreadyRead'] as const).some((key) =>
    matchesAnyLocaleExcerpt(key, trimmed),
  )
}

const MEMORY_SCOPE_KEYS = new Set([
  'characters',
  'character',
  'world',
  'worldview',
  'background',
  'novel',
  'chapter',
  'chapters',
  'story',
  'plot',
  'style',
  'outline',
])

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
      return tPathAction('readStoryMemory')
    }
    if (path.includes('/chapters')) {
      return tPathAction('readChapter')
    }
  }
  if (tool === 'Write' && path.includes('/chapters')) {
    if (path.includes('index.json')) {
      return tPathAction('writeChapterIndex')
    }
    return tPathAction('writeChapter')
  }
  if (tool === 'Write' && isMemoryVfsPath(path)) {
    return tPathAction('writeStoryMemory')
  }
  if (tool === 'Edit' && isMemoryVfsPath(path)) {
    return tPathAction('editStoryMemory')
  }
  if (tool === 'Delete' && isMemoryVfsPath(path)) {
    return tPathAction('deleteStoryMemory')
  }
  if (tool === 'Glob' && (path.includes('/chapters') || path.includes('chapter'))) {
    return tPathAction('browseChapterIndex')
  }
  return undefined
}

function pathFromPayload(payload: Record<string, unknown> | undefined): string {
  return vfsPathFromPayload(payload)
}

function memoryScopeLabel(scope: string): string {
  const key = scope.toLowerCase()
  if (MEMORY_SCOPE_KEYS.has(key)) {
    return i18n.t(`editor:tools.memoryScope.${key}`)
  }
  return tCcDisplay('memoryScope', { scope })
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
      return tCcDisplay('chapterMemory', { key })
    }
    return ''
  }
  const m = normalized.match(/\/memory\/([^/]+)(?:\/([^/]+?))?(?:\.json)?$/i)
  if (!m) {
    return tTool('hints.storyMemory')
  }
  const scope = m[1] ?? ''
  const key = decodeMemoryKeySegment(m[2] ?? '')
  const scopeLabel = memoryScopeLabel(scope)
  if (key && !CHAPTER_ID_RE.test(key)) {
    return tCcDisplay('scopeWithKey', { scope: scopeLabel, key })
  }
  if (scope === 'chapter') {
    return ''
  }
  return scopeLabel
}

function chapterPathHint(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  if (normalized.includes('index.json')) {
    return tTool('hints.chapterIndex')
  }
  const m = normalized.match(/\/chapters\/([^/]+?)\.md$/i)
  if (m) {
    const cid = m[1]
    if (cid === '_new') {
      return tTool('hints.newChapter')
    }
    if (CHAPTER_ID_RE.test(cid)) {
      return tTool('hints.chapterBody')
    }
    return tCcDisplay('chapterNamed', { id: cid })
  }
  if (/\/chapters\/?$/i.test(normalized)) {
    return tTool('hints.chapterIndex')
  }
  return tTool('hints.chapter')
}

function novelRootHint(path: string): string {
  const normalized = path.replace(/\\/g, '/').trim()
  if (!normalized) {
    return tTool('hints.novelCatalog')
  }
  if (/\/novel\/[^/]+\/?$/i.test(normalized)) {
    return tTool('hints.novelCatalog')
  }
  if (normalized.endsWith('/meta.json')) {
    return tTool('hints.novelInfo')
  }
  if (normalized.includes('/outline/')) {
    return tTool('hints.writingOutline')
  }
  return tTool('hints.novelCatalog')
}

function globPatternHint(pattern: string, path: string): string {
  const p = pattern.trim().toLowerCase()
  const base = path.replace(/\\/g, '/')
  if (p.includes('memory') || base.includes('/memory')) {
    return tTool('hints.storyMemoryLibrary')
  }
  if (p.includes('chapter') || base.includes('/chapters')) {
    return tTool('hints.novelChapters')
  }
  if (p === '*' || p === '**/*') {
    return novelRootHint(base)
  }
  return tTool('hints.fileMatch')
}

function grepHint(path: string, pattern?: string): string {
  if (isMemoryVfsPath(path)) {
    return pattern?.trim()
      ? tCcDisplay('searchPattern', { pattern: pattern.trim().slice(0, 32) })
      : tCcDisplay('searchMemory')
  }
  return pattern?.trim()
    ? tCcDisplay('searchChapterPattern', { pattern: pattern.trim().slice(0, 32) })
    : tCcDisplay('searchChapter')
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
        return tTool('hints.storyMemoryLibrary')
      }
      if (path.includes('/chapters')) {
        return tTool('hints.novelChapters')
      }
      return novelRootHint(path)
    }
    return tTool('hints.listFiles')
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
        return tTool('hints.novelInfo')
      }
      if (path.includes('/outline/')) {
        return tTool('hints.writingOutline')
      }
    }
    return tTool('hints.readContent')
  }

  if (tool === 'Write') {
    if (path.includes('/chapters')) {
      return tTool('hints.writeChapter')
    }
    if (isMemoryVfsPath(path)) {
      return memoryPathHint(path)
    }
    return tTool('hints.writeFile')
  }

  if (tool === 'Edit') {
    if (path.includes('/chapters')) {
      return tTool('hints.editChapter')
    }
    if (isMemoryVfsPath(path)) {
      return memoryPathHint(path)
    }
    return tTool('hints.editFile')
  }

  if (tool === 'Delete') {
    if (path.includes('/chapters')) {
      return tTool('hints.deleteChapter')
    }
    if (isMemoryVfsPath(path)) {
      return memoryPathHint(path)
    }
    return tTool('hints.deleteFile')
  }

  if (tool === 'Grep') {
    return grepHint(path, pattern)
  }

  if (tool === 'AskUser') {
    return tTool('hints.waitingReply')
  }

  if (tool === 'TodoWrite') {
    return ''
  }

  if (tool === 'WebFetch') {
    return tTool('hints.fetchPage')
  }

  if (tool === 'WebSearch') {
    return pattern
      ? tCcDisplay('searchPattern', { pattern: pattern.slice(0, 28) })
      : tTool('hints.webSearch')
  }

  if (tool === 'Skill') {
    return tTool('hints.invokeSkill')
  }

  if (tool === 'Agent') {
    return ''
  }

  if (tool.startsWith('Task')) {
    return tTool('hints.taskManagement')
  }

  if (tool === 'ToolSearch') {
    return tTool('hints.findTool')
  }

  if (tool === 'EnterPlanMode' || tool === 'ExitPlanMode') {
    return tTool('hints.planMode')
  }

  if (tool === 'NotebookEdit') {
    return tTool('hints.editNotebook')
  }

  if (tool === 'ListMcpResources' || tool === 'ReadMcpResource') {
    return tTool('hints.mcpResources')
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
  if (fromExcerpt && !isIgnoredReadResultLabel(fromExcerpt)) {
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
  const fromWire = rawTool ? toolDisplayName(rawTool) : toolDisplayName('')
  const raw = normalizeToolName(step.toolName) || rawTool
  const generic = raw ? toolDisplayName(raw) : fromWire
  const title = step.title?.trim() ?? ''
  const path = pathFromStep(step)

  if (title && (title === rawTool || title === raw) && fromWire) {
    return fromWire
  }

  if (title && !isGenericToolLabel(title) && title !== generic) {
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
  return title ? translateToolDisplayName(title) : toolDisplayName('')
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
      return tCcDisplay('todoCount', { count: step.todos.length })
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
  if (idleLabel && !isIgnoredReadResultLabel(idleLabel) && idleLabel !== compact) {
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
    return tTool('generatingOptions')
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
