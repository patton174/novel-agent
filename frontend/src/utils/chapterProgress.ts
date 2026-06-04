import type { AgentStepState } from '../types/agent'
import { normalizeToolName } from './agentToolNames'
import { chapterWriteProgressLabel } from './agentLabels'

const GENERIC_CHAPTER_PROGRESS_RE =
  /^正在(写入|编写|编辑)章节(正文)?[。.…]*$/i

const GENERIC_TOOL_TITLE_RE =
  /^(编辑|写入|阅读章节|编辑章节|写入章节|Read|Write|Edit)$/i

export function isGenericChapterProgressMessage(msg?: string): boolean {
  const t = (msg ?? '').trim()
  if (!t) {
    return false
  }
  return GENERIC_CHAPTER_PROGRESS_RE.test(t)
}

function isUsableChapterLabel(text?: string): boolean {
  const t = (text ?? '').trim()
  if (!t) {
    return false
  }
  if (isGenericChapterProgressMessage(t)) {
    return false
  }
  if (GENERIC_TOOL_TITLE_RE.test(t)) {
    return false
  }
  return true
}

/** 章节 Write/Edit 进行中：优先章节名，避免被「正在写入章节正文」覆盖 */
export function chapterWriteProgressHint(step: AgentStepState): string {
  const candidates = [
    step.resultLabels?.[0],
    step.title,
    step.detail,
    step.toolArgs,
  ]
  for (const c of candidates) {
    if (isUsableChapterLabel(c)) {
      return chapterWriteProgressLabel(c, step.toolName)
    }
  }
  return chapterWriteProgressLabel(undefined, step.toolName)
}

export function isChapterWriteToolName(name: string | undefined): boolean {
  const n = normalizeToolName(name)
  return n === 'Write' || n === 'Edit'
}
