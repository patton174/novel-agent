import type { AgentStepState } from '../types/agent'
import { ccToolHumanSubtitle } from './ccToolDisplay'
import { normalizeToolName, vfsPathFromPayload } from './agentToolNames'
import { formatGlobGrepDisplayOutput } from './vfsInventoryDisplay'

const MAX_DISPLAY = 10_000

function cap(text: string): string {
  const t = text.trim()
  if (t.length <= MAX_DISPLAY) {
    return t
  }
  return `${t.slice(0, MAX_DISPLAY)}\n…（已截断）`
}

export function formatToolInputFromPayload(
  raw: Record<string, unknown> | undefined,
  toolName?: string,
): string | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }
  const lines: string[] = []
  const filePath = vfsPathFromPayload(raw)
  const pattern =
    typeof raw.pattern === 'string'
      ? raw.pattern
      : typeof raw.glob_pattern === 'string'
        ? raw.glob_pattern
        : ''
  if (filePath) {
    const hint = ccToolHumanSubtitle(toolName, { path: filePath, pattern })
    lines.push(hint && !hint.includes('.md') ? hint : '作品库路径（非本机磁盘）')
  }
  if (pattern && !lines.some((l) => l.includes(pattern))) {
    lines.push(`匹配: ${pattern}`)
  }
  if (typeof raw.offset === 'number') {
    lines.push(`起始行: ${raw.offset}`)
  }
  if (typeof raw.limit === 'number') {
    lines.push(`行数: ${raw.limit}`)
  }
  if (typeof raw.head_limit === 'number') {
    lines.push(`最多: ${raw.head_limit} 条`)
  }
  if (typeof raw.replace_all === 'boolean') {
    lines.push(`全部替换: ${raw.replace_all ? '是' : '否'}`)
  }
  const bodyText =
    typeof raw.content === 'string' && raw.content.trim()
      ? raw.content.trim()
      : typeof raw.new_content === 'string' && raw.new_content.trim()
        ? raw.new_content.trim()
        : typeof raw.payload === 'string' && raw.payload.trim()
          ? raw.payload.trim()
          : ''
  if (bodyText) {
    const preview =
      bodyText.length > 400 ? `${bodyText.slice(0, 400)}…（共 ${bodyText.length} 字）` : bodyText
    lines.push(`正文: ${preview}`)
  }
  if (typeof raw.new_title === 'string' && raw.new_title.trim()) {
    lines.push(`改名为: ${raw.new_title.trim()}`)
  } else if (typeof raw.title === 'string' && raw.title.trim()) {
    lines.push(`标题: ${raw.title.trim()}`)
  }
  if (typeof raw.query === 'string' && raw.query.trim()) {
    lines.push(`查询: ${raw.query.trim()}`)
  }
  if (typeof raw.scope === 'string' && raw.scope.trim()) {
    lines.push(`范围: ${raw.scope.trim()}`)
  }
  if (typeof raw.memory_id === 'string' && raw.memory_id.trim()) {
    const mid = raw.memory_id.trim()
    lines.push(`记忆节点: ${mid.length > 16 ? `${mid.slice(0, 8)}…` : mid}`)
  }
  if (typeof raw.parent_id === 'string' && raw.parent_id.trim()) {
    const pid = raw.parent_id.trim()
    lines.push(`父节点: ${pid.length > 16 ? `${pid.slice(0, 8)}…` : pid}`)
  }
  if (typeof raw.node_type === 'string' && raw.node_type.trim()) {
    const nt = raw.node_type.trim()
    lines.push(
      `节点类型: ${nt === 'root' ? '根节点' : nt === 'child' ? '子节点' : nt}`,
    )
  }
  if (typeof raw.node_kind === 'string' && raw.node_kind.trim()) {
    lines.push(`节点形态: ${raw.node_kind.trim()}`)
  }
  const style = raw.style
  if (style && typeof style === 'object' && !Array.isArray(style)) {
    const layout = (style as Record<string, unknown>).layout
    if (typeof layout === 'string' && layout.trim()) {
      lines.push(`排版: ${layout.trim()}`)
    }
  }
  if (typeof raw.key === 'string' && raw.key.trim()) {
    lines.push(`条目: ${raw.key.trim()}`)
  }
  if (typeof raw.character === 'string' && raw.character.trim()) {
    lines.push(`角色: ${raw.character.trim()}`)
  }
  if (typeof raw.position === 'number') {
    lines.push(`移动到第 ${raw.position} 位`)
  } else if (typeof raw.index === 'number') {
    lines.push(`序号: 第 ${raw.index} 章`)
  }
  if (typeof raw.old_string === 'string' && raw.old_string) {
    const s = raw.old_string
    lines.push(`替换前: ${s.length > 120 ? `${s.slice(0, 120)}…` : s}`)
  }
  if (typeof raw.new_string === 'string' && raw.new_string) {
    const s = raw.new_string
    lines.push(`替换后: ${s.length > 120 ? `${s.slice(0, 120)}…` : s}`)
  }
  if (lines.length === 0) {
    // Never surface raw JSON nor bare ids/UUIDs — render remaining scalar args as text.
    const scalarLines = Object.entries(raw)
      .filter(([k, v]) => {
        if (v == null) {
          return false
        }
        if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') {
          return false
        }
        return !isIdLikeKey(k)
      })
      .map(([k, v]) => {
        const s = String(v).trim()
        if (!s) {
          return ''
        }
        return `${k}: ${s.length > 120 ? `${s.slice(0, 120)}…` : s}`
      })
      .filter(Boolean)
    if (scalarLines.length === 0) {
      return undefined
    }
    return cap(scalarLines.join('\n'))
  }
  return lines.join('\n')
}

const ID_LIKE_KEY_RE = /(^id$|_id$|uuid|tool_call_id)/i

/** Keys whose values are opaque ids/UUIDs — never worth showing to the user. */
function isIdLikeKey(key: string): boolean {
  return ID_LIKE_KEY_RE.test(key)
}

const LINE_NUM_RE = /^\s*\d+\t/

/** Unescape literal \\n from JSON/tool payloads for display only. */
export function normalizeToolDisplayText(text: string): string {
  return text.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"')
}

export function stripToolLineNumbers(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const m = line.match(/^\s*\d+\t(.*)$/)
      return m ? m[1] : line
    })
    .join('\n')
}

export function toolOutputFromPayload(
  payload: Record<string, unknown>,
  toolName?: string,
): string | undefined {
  const canonical = normalizeToolName(toolName)
  const excerpt =
    typeof payload.display_excerpt === 'string' && payload.display_excerpt.trim()
      ? cap(normalizeToolDisplayText(payload.display_excerpt.trim()))
      : undefined
  if (canonical === 'Glob' || canonical === 'Grep') {
    if (typeof payload.output === 'string' && payload.output.trim()) {
      const tree = cap(formatGlobGrepDisplayOutput(payload.output))
      return excerpt ? `${excerpt}\n\n${tree}` : tree
    }
    return excerpt
  }
  if (excerpt) {
    return excerpt
  }
  if (typeof payload.output === 'string' && payload.output.trim()) {
    const raw = normalizeToolDisplayText(payload.output.trim())
    if (LINE_NUM_RE.test(raw) || raw.startsWith('---')) {
      return cap(stripToolLineNumbers(raw))
    }
    return cap(raw)
  }
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return cap(payload.error)
  }
  const labels = payload.result_labels
  if (Array.isArray(labels) && labels.length) {
    return labels.map((l) => String(l)).join('\n')
  }
  if (typeof payload.output_summary === 'string' && payload.output_summary.trim()) {
    return cap(payload.output_summary.trim())
  }
  return undefined
}

const INVENTORY_HEADER_RE =
  /^#\s*(数据来源|章节（|记忆（|禁止用)/

export function toolOutputPreview(text: string, maxLines = 5): string {
  const lines = text
    .split('\n')
    .filter((line) => line.trim() && !INVENTORY_HEADER_RE.test(line.trim()))
  const body = lines.join('\n').trim()
  if (!body) {
    return text.trim().slice(0, 240)
  }
  return body.split('\n').slice(0, maxLines).join('\n')
}

/** 章节 Read：分支第二行正文摘要（首行标题已在 result_labels） */
function looksLikeRawToolDump(text: string): boolean {
  return (
    /^\s*\d+\t/m.test(text) ||
    /^---\s*$/m.test(text) ||
    /^title:\s*.+$/m.test(text) ||
    /^chapter_id:\s*[0-9a-f-]{8}/im.test(text) ||
    /^Deleted\s+\/novel\//i.test(text)
  )
}

const CHAPTER_INDEX_ONLY_RE = /^第\d+章$/
const EMPTY_EXCERPT_MARKERS = new Set(['（空）', '空章节', '已读取', '未变更'])

function isChapterTitleOnlyLine(line: string): boolean {
  const t = line.trim()
  if (!t) {
    return true
  }
  if (EMPTY_EXCERPT_MARKERS.has(t)) {
    return true
  }
  if (CHAPTER_INDEX_ONLY_RE.test(t)) {
    return true
  }
  return t.startsWith('《') && t.endsWith('》')
}

export function readToolBodyExcerpt(step: AgentStepState): string | undefined {
  let raw =
    step.displayExcerpt?.trim() ||
    step.toolOutputDetail?.trim() ||
    undefined
  if (!raw && step.outputSummary?.trim() && !step.resultLabels?.length) {
    raw = step.outputSummary.trim()
  }
  if (!raw) {
    return undefined
  }
  raw = normalizeToolDisplayText(raw)
  if (looksLikeRawToolDump(raw)) {
    raw = toolOutputPreview(cap(stripToolLineNumbers(raw)))
  }
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) {
    return undefined
  }
  if (lines.length === 1) {
    const only = lines[0]
    if (isChapterTitleOnlyLine(only)) {
      return undefined
    }
    return only
  }
  const body = lines.slice(1).join('\n').trim()
  return body || undefined
}

export function isToolAckJsonStub(text: string | undefined): boolean {
  const t = (text || '').trim()
  if (!t.startsWith('{')) {
    return false
  }
  try {
    const parsed = JSON.parse(t) as Record<string, unknown>
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return false
    }
    const keys = Object.keys(parsed)
    if (parsed.ok === true && keys.length <= 6) {
      return true
    }
    if (
      typeof parsed.chapter_id === 'string' &&
      !('chapters' in parsed) &&
      keys.length <= 5
    ) {
      return true
    }
    if (typeof parsed.memory_id === 'string' && keys.length <= 6) {
      return true
    }
    if (typeof parsed.skill === 'string' && parsed.loaded === true) {
      return true
    }
    if ('deleted' in parsed && parsed.ok === true) {
      return true
    }
    return false
  } catch {
    return false
  }
}

/** @deprecated use isToolAckJsonStub */
export function isChapterToolOkStub(text: string | undefined): boolean {
  return isToolAckJsonStub(text)
}

export function isCompactToolResultText(text: string | undefined): boolean {
  const t = (text || '').trim()
  if (!t || t === '（空）' || t === '空章节' || t === '已读取') {
    return false
  }
  if (t.startsWith('{') || isToolAckJsonStub(t)) {
    return false
  }
  return !/tool_use_error|upstream_/i.test(t)
}

export function buildToolDetailSections(step: AgentStepState): {
  input?: string
  output?: string
} {
  const input =
    step.toolInputText ||
    (step.toolInput && Object.keys(step.toolInput).length > 0
      ? formatToolInputFromPayload(step.toolInput, step.toolName)
      : undefined)
  const tool = normalizeToolName(step.toolName)
  let output =
    tool === 'Glob' || tool === 'Grep'
      ? step.toolOutputDetail?.trim()
      : step.displayExcerpt?.trim() ||
        step.toolOutputDetail?.trim() ||
        step.outputSummary?.trim() ||
        undefined
  if (output?.trim()) {
    if (isToolAckJsonStub(output)) {
      output = undefined
    } else {
      const normalized = cap(stripToolLineNumbers(normalizeToolDisplayText(output)))
      output =
        tool === 'Glob' || tool === 'Grep'
          ? formatGlobGrepDisplayOutput(normalized)
          : toolOutputPreview(normalized)
    }
  }
  return {
    input: input?.trim() || undefined,
    output: output?.trim() || undefined,
  }
}

export function toolDetailHasExpandableContent(step: AgentStepState): boolean {
  if (normalizeToolName(step.toolName) === 'Agent' && step.subagent) {
    return false
  }
  const { input, output } = buildToolDetailSections(step)
  if (output && isToolAckJsonStub(output)) {
    return Boolean(input)
  }
  return Boolean(input || output)
}
