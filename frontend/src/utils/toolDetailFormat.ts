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
  if (typeof raw.content === 'string' && raw.content.trim()) {
    const body = raw.content.trim()
    const preview =
      body.length > 400 ? `${body.slice(0, 400)}…（共 ${body.length} 字）` : body
    lines.push(`正文: ${preview}`)
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
    const keys = Object.keys(raw)
    if (keys.length === 0) {
      return undefined
    }
    try {
      return cap(JSON.stringify(raw, null, 2))
    } catch {
      return undefined
    }
  }
  return lines.join('\n')
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
    if (only.startsWith('《') && only.endsWith('》')) {
      return undefined
    }
    return only
  }
  const body = lines.slice(1).join('\n').trim()
  return body || undefined
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
    const normalized = cap(stripToolLineNumbers(normalizeToolDisplayText(output)))
    output =
      tool === 'Glob' || tool === 'Grep'
        ? formatGlobGrepDisplayOutput(normalized)
        : toolOutputPreview(normalized)
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
  return Boolean(input || output)
}
