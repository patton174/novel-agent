import type { EditorCenterTab } from '@/components/editor/EditorCenterTabs'
import {
  SESSION_QUERY_LANG,
  SESSION_QUERY_THEME,
  buildSearchWithSessionPrefs,
  currentAppLocale,
  stripSessionQuery,
} from '@/lib/appSessionState'
import type { ThemeMode } from '@/stores/themeStore'

/** 编辑器业务 query（不含 lang/theme） */
export const EDITOR_QUERY = {
  NOVEL_ID: 'novelId',
  /** 内容侧会话 / Agent session_id（canonical） */
  SESSION_ID: 'sessionId',
  /** 与 sessionId 同义，便于分享链接与旧书签 */
  CONVERSATION_ID: 'conversationId',
  TAB: 'tab',
  PROMPT: 'prompt',
  ACTION: 'action',
  MEMORY: 'memory',
} as const

export interface EditorUrlSnapshot {
  pathname: string
  novelId: string | null
  sessionId: string | null
  tab: EditorCenterTab
  prompt: string | null
  action: string | null
  memoryOpen: boolean
}

export function readEditorSessionId(search: string): string | null {
  const params = new URLSearchParams(search.replace(/^\?/, ''))
  const sessionId = params.get(EDITOR_QUERY.SESSION_ID)?.trim()
  if (sessionId) {
    return sessionId
  }
  return params.get(EDITOR_QUERY.CONVERSATION_ID)?.trim() || null
}

export function readEditorTab(search: string): EditorCenterTab | null {
  const raw = new URLSearchParams(search.replace(/^\?/, '')).get(EDITOR_QUERY.TAB)?.trim()
  if (raw === 'chat' || raw === 'story') {
    return raw
  }
  return null
}

export function readEditorUrlSnapshot(pathname: string, search: string): EditorUrlSnapshot {
  const params = new URLSearchParams(stripSessionQuery(search).replace(/^\?/, ''))
  const tab = readEditorTab(search) ?? 'chat'
  return {
    pathname,
    novelId: params.get(EDITOR_QUERY.NOVEL_ID)?.trim() || null,
    sessionId: readEditorSessionId(search),
    tab,
    prompt: params.get(EDITOR_QUERY.PROMPT)?.trim() || null,
    action: params.get(EDITOR_QUERY.ACTION)?.trim() || null,
    memoryOpen: params.get(EDITOR_QUERY.MEMORY) === '1',
  }
}

export function buildEditorPathname(chapterId?: string | null): string {
  const id = chapterId?.trim()
  return id ? `/editor/${encodeURIComponent(id)}` : '/editor'
}

export function buildEditorSearch(input: {
  novelId?: string | null
  sessionId?: string | null
  tab?: EditorCenterTab
  prompt?: string | null
  action?: string | null
  memoryOpen?: boolean
  locale?: string
  theme?: ThemeMode
  /** 保留其它已有 query（如 dashboard 跳转带参） */
  baseSearch?: string
}): string {
  const params = new URLSearchParams(
    stripSessionQuery(input.baseSearch ?? '').replace(/^\?/, ''),
  )

  if (input.novelId) {
    params.set(EDITOR_QUERY.NOVEL_ID, input.novelId)
  } else {
    params.delete(EDITOR_QUERY.NOVEL_ID)
  }

  const sessionId = input.sessionId?.trim()
  if (sessionId) {
    params.set(EDITOR_QUERY.SESSION_ID, sessionId)
    params.set(EDITOR_QUERY.CONVERSATION_ID, sessionId)
  } else {
    params.delete(EDITOR_QUERY.SESSION_ID)
    params.delete(EDITOR_QUERY.CONVERSATION_ID)
  }

  if (input.tab) {
    params.set(EDITOR_QUERY.TAB, input.tab)
  } else {
    params.delete(EDITOR_QUERY.TAB)
  }

  if (input.prompt?.trim()) {
    params.set(EDITOR_QUERY.PROMPT, input.prompt.trim())
  } else {
    params.delete(EDITOR_QUERY.PROMPT)
  }

  if (input.action?.trim()) {
    params.set(EDITOR_QUERY.ACTION, input.action.trim())
  } else {
    params.delete(EDITOR_QUERY.ACTION)
  }

  if (input.memoryOpen) {
    params.set(EDITOR_QUERY.MEMORY, '1')
  } else {
    params.delete(EDITOR_QUERY.MEMORY)
  }

  params.delete(SESSION_QUERY_LANG)
  params.delete(SESSION_QUERY_THEME)

  const business = params.toString()
  const locale = currentAppLocale(input.locale)
  const theme = input.theme ?? 'system'
  return buildSearchWithSessionPrefs(business ? `?${business}` : '', locale, theme).replace(/^\?/, '')
}

export function buildEditorLocation(input: {
  chapterId?: string | null
  novelId?: string | null
  sessionId?: string | null
  tab?: EditorCenterTab
  prompt?: string | null
  action?: string | null
  memoryOpen?: boolean
  locale?: string
  theme?: ThemeMode
  baseSearch?: string
}): { pathname: string; search: string } {
  const pathChapterId = input.tab === 'story' ? input.chapterId : null
  return {
    pathname: buildEditorPathname(pathChapterId),
    search: buildEditorSearch(input),
  }
}
