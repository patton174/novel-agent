import i18n from '@/i18n'

/** Legacy placeholders persisted before i18n migration */
const LEGACY_PLACEHOLDER_TITLES = ['', '新对话', '新会话', '未命名对话'] as const

const LEGACY_GENERATING_TITLE = '生成标题…'

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

function placeholderTitles(): Set<string> {
  return new Set([
    ...LEGACY_PLACEHOLDER_TITLES,
    i18n.t('dashboard:session.defaultTitle'),
    i18n.t('dashboard:session.altTitle'),
    i18n.t('dashboard:session.unnamedTitle'),
  ])
}

function genericUserMessages(): Set<string> {
  return new Set([
    i18n.t('dashboard:session.genericContinue'),
    i18n.t('dashboard:session.genericContinueWrite'),
    i18n.t('dashboard:session.genericOptimize'),
    i18n.t('dashboard:session.genericOk'),
    i18n.t('dashboard:session.genericYes'),
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
}

export function sessionNeedsGeneratedTitle(title: string | undefined | null): boolean {
  const t = (title ?? '').trim()
  if (!t) return true
  if (placeholderTitles().has(t)) return true
  if (t === i18n.t('dashboard:session.generatingTitle') || t === LEGACY_GENERATING_TITLE) {
    return true
  }
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
  const generic = genericUserMessages()
  const isGeneric =
    !user || generic.has(user) || (user.length <= 4 && !/[章节第\d]/.test(user))

  if (isGeneric) {
    const novelShort = novel.length > 12 ? `${novel.slice(0, 12)}…` : novel
    const stamp = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    if (novelShort) {
      const base =
        user && !generic.has(user)
          ? `${user} · ${novelShort}`
          : i18n.t('dashboard:session.continueNovel', { novel: novelShort })
      return base.length > 24 ? `${base.slice(0, 23)}…` : base
    }
    return i18n.t('dashboard:session.newChatWithStamp', { stamp })
  }

  if (user.length > 18) return `${user.slice(0, 18)}…`
  return user || i18n.t('dashboard:session.defaultTitle')
}
