/**
 * CC tool names + legacy aliases for persisted SSE / chat replay.
 */

/** Canonical CC tools exposed in orchestration UI */
export const CC_ORCHESTRATION_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'Delete',
  'AskUser',
  'TodoWrite',
  'ToolSearch',
  'WebFetch',
  'WebSearch',
  'EnterPlanMode',
  'ExitPlanMode',
  'Brief',
  'Skill',
  'Agent',
  'TaskCreate',
  'TaskGet',
  'TaskList',
  'TaskUpdate',
  'TaskStop',
  'NotebookEdit',
  'ListMcpResources',
  'ReadMcpResource',
] as const

/** @deprecated use CC_ORCHESTRATION_TOOLS */
export const ORCHESTRATION_TOOLS = CC_ORCHESTRATION_TOOLS

/** Map legacy wire names → CC canonical name (display / icons only). */
const LEGACY_TOOL_ALIASES: Record<string, string> = {
  chapter_list: 'Glob',
  chapter_read: 'Read',
  chapter_create: 'Write',
  chapter_update: 'Edit',
  chapter_delete: 'Delete',
  memory_read: 'Read',
  memory_create: 'Write',
  memory_update: 'Edit',
  memory_delete: 'Delete',
  memory_patch: 'Edit',
  choose: 'AskUser',
  ask_user: 'AskUser',
  context_search: 'Grep',
}

export function normalizeToolName(name: string | undefined): string {
  const raw = (name ?? '').trim()
  if (!raw) {
    return ''
  }
  return LEGACY_TOOL_ALIASES[raw] ?? raw
}

export function isLegacyToolName(name: string | undefined): boolean {
  const raw = (name ?? '').trim()
  return Boolean(raw && raw in LEGACY_TOOL_ALIASES)
}

export function isAskUserTool(name: string | undefined): boolean {
  const raw = (name ?? '').trim()
  return raw === 'AskUser' || raw === 'choose' || raw === 'ask_user'
}

export function isChapterWriteTool(name: string | undefined): boolean {
  const n = normalizeToolName(name)
  return n === 'Write' || n === 'Edit'
}

export function isVfsReadTool(name: string | undefined): boolean {
  const n = normalizeToolName(name)
  return n === 'Read' || n === 'Grep' || n === 'Glob'
}

/** Consecutive read-style tools (Read/Grep/Glob or legacy memory_read) with result_labels. */
export function isCollapsibleReadTool(name: string | undefined): boolean {
  const raw = (name ?? '').trim()
  if (raw === 'memory_read') {
    return true
  }
  const n = normalizeToolName(name)
  return n === 'Read' || n === 'Grep'
}

export function isMemoryMutationTool(name: string | undefined): boolean {
  const raw = (name ?? '').trim()
  if (/^memory_(create|update|delete|patch)$/.test(raw)) {
    return true
  }
  const n = normalizeToolName(name)
  return n === 'Write' || n === 'Edit' || n === 'Delete'
}

export function vfsPathFromPayload(payload: Record<string, unknown> | undefined): string {
  if (!payload) {
    return ''
  }
  for (const key of ['file_path', 'path', 'target_file']) {
    const v = payload[key]
    if (typeof v === 'string' && v.trim()) {
      return v.trim()
    }
  }
  return ''
}

export function isMemoryVfsPath(path: string): boolean {
  return /\/memory\//i.test(path)
}

/** Write/Edit/Delete 是否作用于章节正文（而非 story-memory 路径）。 */
export function isChapterContentSideEffect(
  toolName: string | undefined,
  payload?: Record<string, unknown>,
): boolean {
  const raw = (toolName ?? '').trim()
  if (/^chapter_(create|update|delete)$/i.test(raw)) {
    return true
  }
  const n = normalizeToolName(raw)
  if (
    n === 'WriteChapter' ||
    n === 'EditChapter' ||
    n === 'DeleteChapter' ||
    n === 'ReorderChapters'
  ) {
    return true
  }
  if (n !== 'Write' && n !== 'Edit' && n !== 'Delete') {
    return false
  }
  const path = vfsPathFromPayload(payload)
  if (path && isMemoryVfsPath(path)) {
    return false
  }
  if (path && /\/chapters\//i.test(path)) {
    return true
  }
  return !path
}

/** WriteChapter/EditChapter 或 legacy Write/Edit 是否走 chapter.stream.* 管线 */
export function isChapterStreamTool(toolName: string | undefined): boolean {
  const n = normalizeToolName((toolName ?? '').trim())
  return n === 'WriteChapter' || n === 'EditChapter' || n === 'Write' || n === 'Edit'
}

export function shouldRefreshStoryMemoryAfterTool(
  toolName: string | undefined,
  payload?: Record<string, unknown>,
): boolean {
  const raw = (toolName ?? '').trim()
  const canonical = normalizeToolName(raw)
  if (
    canonical === 'WriteMemory' ||
    canonical === 'EditMemory' ||
    canonical === 'DeleteMemory'
  ) {
    return true
  }
  if (/^memory_(create|update|delete|patch)$/.test(raw)) {
    return true
  }
  const path = vfsPathFromPayload(payload)
  if (path && isMemoryVfsPath(path)) {
    return normalizeToolName(raw) === 'Write' ||
      normalizeToolName(raw) === 'Edit' ||
      normalizeToolName(raw) === 'Delete'
  }
  return false
}
