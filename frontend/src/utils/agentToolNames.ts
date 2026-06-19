/**
 * Agent tool names — API wire names with icon aliases for CC-style UI.
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

/** Map API tool names → CC icon bucket (display only). */
const TOOL_ICON_ALIASES: Record<string, string> = {
  ReadMemory: 'Read',
  CreateMemory: 'Write',
  UpdateMemoryFields: 'Edit',
  UpdateMemoryContent: 'Edit',
  UpdateMemoryMeta: 'Edit',
  MoveMemory: 'Edit',
  DeleteMemory: 'Delete',
  ListMemory: 'Glob',
  GetMemoryTree: 'Glob',
  ReadChapter: 'Read',
  WriteChapter: 'Write',
  EditChapter: 'Edit',
  DeleteChapter: 'Delete',
  ListChapters: 'Glob',
  SearchKnowledge: 'Grep',
  choose: 'AskUser',
  ask_user: 'AskUser',
}

const MEMORY_API_TOOLS = new Set([
  'ReadMemory',
  'CreateMemory',
  'UpdateMemoryFields',
  'UpdateMemoryContent',
  'UpdateMemoryMeta',
  'MoveMemory',
  'DeleteMemory',
  'ListMemory',
  'GetMemoryTree',
])

const CHAPTER_API_TOOLS = new Set([
  'ReadChapter',
  'WriteChapter',
  'EditChapter',
  'DeleteChapter',
  'ListChapters',
  'ReorderChapters',
])

const MEMORY_MUTATION_TOOLS = new Set([
  'CreateMemory',
  'UpdateMemoryFields',
  'UpdateMemoryContent',
  'UpdateMemoryMeta',
  'MoveMemory',
  'DeleteMemory',
])

/** Wire/API tool name — use for branching logic, never for icon aliases. */
export function canonicalToolName(name: string | undefined): string {
  return (name ?? '').trim()
}

export function normalizeToolName(name: string | undefined): string {
  const raw = canonicalToolName(name)
  if (!raw) {
    return ''
  }
  return TOOL_ICON_ALIASES[raw] ?? raw
}

export function isMemoryListTool(name: string | undefined): boolean {
  const raw = canonicalToolName(name)
  return raw === 'ListMemory' || raw === 'GetMemoryTree'
}

export function isMemoryWriteTool(name: string | undefined): boolean {
  const raw = canonicalToolName(name)
  return (
    raw === 'CreateMemory' ||
    raw === 'UpdateMemoryFields' ||
    raw === 'UpdateMemoryContent' ||
    raw === 'UpdateMemoryMeta' ||
    raw === 'MoveMemory' ||
    raw === 'DeleteMemory'
  )
}

export function isMemoryApiTool(name: string | undefined): boolean {
  const raw = canonicalToolName(name)
  return Boolean(raw && MEMORY_API_TOOLS.has(raw))
}

export function isListChaptersTool(name: string | undefined): boolean {
  return canonicalToolName(name) === 'ListChapters'
}

export function isInventoryListTool(name: string | undefined): boolean {
  return isListChaptersTool(name) || isMemoryListTool(name)
}

export function isLegacyToolName(_name: string | undefined): boolean {
  return false
}

export function isAskUserTool(name: string | undefined): boolean {
  const raw = (name ?? '').trim()
  return raw === 'AskUser' || raw === 'choose' || raw === 'ask_user'
}

export function isChapterWriteTool(name: string | undefined): boolean {
  if (isMemoryApiTool(name)) {
    return false
  }
  const raw = (name ?? '').trim()
  return (
    CHAPTER_API_TOOLS.has(raw) &&
    (raw === 'WriteChapter' || raw === 'EditChapter' || raw === 'ReorderChapters')
  )
}

export function isVfsReadTool(name: string | undefined): boolean {
  const raw = (name ?? '').trim()
  return raw === 'ReadMemory' || raw === 'ReadChapter' || raw === 'SearchKnowledge'
}

export function isCollapsibleReadTool(name: string | undefined): boolean {
  const raw = (name ?? '').trim()
  return raw === 'ReadMemory' || raw === 'ReadChapter' || raw === 'SearchKnowledge'
}

export function isMemoryMutationTool(name: string | undefined): boolean {
  const raw = (name ?? '').trim()
  return MEMORY_MUTATION_TOOLS.has(raw)
}

/** Write/Edit/Delete 是否作用于章节正文。 */
export function isChapterContentSideEffect(
  toolName: string | undefined,
  _payload?: Record<string, unknown>,
): boolean {
  const raw = (toolName ?? '').trim()
  if (isMemoryApiTool(raw)) {
    return false
  }
  return (
    raw === 'WriteChapter' ||
    raw === 'EditChapter' ||
    raw === 'DeleteChapter' ||
    raw === 'ReorderChapters'
  )
}

/** WriteChapter/EditChapter 是否走 chapter.stream.* 管线 */
export function isChapterStreamTool(toolName: string | undefined): boolean {
  const raw = (toolName ?? '').trim()
  if (isMemoryApiTool(raw)) {
    return false
  }
  return raw === 'WriteChapter' || raw === 'EditChapter'
}

export function shouldRefreshMemoryAfterTool(toolName: string | undefined): boolean {
  const raw = (toolName ?? '').trim()
  return MEMORY_MUTATION_TOOLS.has(raw)
}

/** @deprecated use shouldRefreshMemoryAfterTool */
export const shouldRefreshStoryMemoryAfterTool = shouldRefreshMemoryAfterTool

/** @deprecated VFS paths removed; kept for callers that still read optional file_path. */
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

/** @deprecated VFS memory paths removed */
export function isMemoryVfsPath(_path: string): boolean {
  return false
}
