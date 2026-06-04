/** Placeholder session titles that should be replaced by async LLM naming. */
const PLACEHOLDER_TITLES = new Set(['', '新对话', '新会话', '未命名对话'])

const GENERIC_USER_MESSAGES = new Set([
  '继续',
  '继续写',
  '继续优化',
  '好',
  '好的',
  '嗯',
  '是的',
  'ok',
  'OK',
])

/** Assistant / system lines that must not drive session titles. */
const BOILERPLATE_SNIPPET_PATTERNS: RegExp[] = [
  /我整理好了上下文/,
  /没有生成可展示正文/,
  /请给我一句更明确的续写指令/,
  /^Read:\s*#/i,
  /^\{'signature'/,
  /^\*\*删除完成/,
  /连接中断，任务在后台继续/,
]

const BOILERPLATE_TITLE_PATTERNS: RegExp[] = [
  /^我整理好了上下文/,
  /^Read:\s*#/i,
  /^\{'signature'/,
  /^\*\*删除完成/,
]

export function sessionNeedsGeneratedTitle(title: string | undefined | null): boolean {
  const t = (title ?? '').trim()
  if (!t) return true
  if (PLACEHOLDER_TITLES.has(t)) return true
  if (t === '生成标题…') return true
  if (isBoilerplateSessionTitle(t)) return true
  return false
}

export function isBoilerplateSessionTitle(title: string): boolean {
  const t = title.trim()
  if (!t) return false
  return BOILERPLATE_TITLE_PATTERNS.some((re) => re.test(t))
}

export function sanitizeAssistantSnippetForTitle(snippet: string): string {
  const t = snippet.trim()
  if (!t) return ''
  if (BOILERPLATE_SNIPPET_PATTERNS.some((re) => re.test(t))) return ''
  if (/^Read:\s*#/i.test(t) || /^\{'signature'/i.test(t)) return ''
  return t.slice(0, 400)
}

export function buildSessionTitleFallback(options: {
  userMessage: string
  novelTitle?: string | null
  now?: Date
}): string {
  const user = options.userMessage.trim()
  const novel = (options.novelTitle ?? '').trim()
  const now = options.now ?? new Date()
  const isGeneric =
    !user || GENERIC_USER_MESSAGES.has(user) || (user.length <= 4 && !/[章节第\d]/.test(user))

  if (isGeneric) {
    const novelShort = novel.length > 12 ? `${novel.slice(0, 12)}…` : novel
    const stamp = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    if (novelShort) {
      const base = user && !GENERIC_USER_MESSAGES.has(user) ? `${user} · ${novelShort}` : `续写 · ${novelShort}`
      return base.length > 24 ? `${base.slice(0, 23)}…` : base
    }
    return `新对话 ${stamp}`
  }

  if (user.length > 18) return `${user.slice(0, 18)}…`
  return user || '新对话'
}
