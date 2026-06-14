/** Fanqie-style create-novel draft fields + assembly for stored description. */

export interface NovelDraftForm {
  title: string
  genre: string
  tags: string
  style: string
  hook: string
  protagonist: string
  worldview: string
  synopsis: string
  sellingPoints: string
  targetChapterWords: number
}

export interface NovelDraftSuggestion extends NovelDraftForm {
  description: string
}

export const NOVEL_GENRE_OPTIONS = [
  '玄幻',
  '奇幻',
  '仙侠',
  '都市',
  '科幻',
  '悬疑',
  '历史',
  '游戏',
  '体育',
  '诸天无限',
] as const

export const NOVEL_TAG_PRESETS = [
  '爽文',
  '单女主',
  '单男主',
  '系统',
  '重生',
  '穿越',
  '全民求生',
  '无敌流',
  '快节奏',
] as const

export function emptyNovelDraftForm(): NovelDraftForm {
  return {
    title: '',
    genre: '',
    tags: '',
    style: '',
    hook: '',
    protagonist: '',
    worldview: '',
    synopsis: '',
    sellingPoints: '',
    targetChapterWords: 3000,
  }
}

export function assembleNovelDescription(form: Pick<
  NovelDraftForm,
  'hook' | 'synopsis' | 'worldview' | 'protagonist' | 'sellingPoints'
>): string {
  const parts: string[] = []
  if (form.hook.trim()) parts.push(`【一句话卖点】${form.hook.trim()}`)
  if (form.synopsis.trim()) parts.push(`【简介】\n${form.synopsis.trim()}`)
  if (form.worldview.trim()) parts.push(`【世界观】${form.worldview.trim()}`)
  if (form.protagonist.trim()) parts.push(`【主角】${form.protagonist.trim()}`)
  if (form.sellingPoints.trim()) parts.push(`【卖点】${form.sellingPoints.trim()}`)
  return parts.join('\n\n')
}

export function applyNovelDraftSuggestion(
  prev: NovelDraftForm,
  suggestion: NovelDraftSuggestion,
): NovelDraftForm {
  return {
    title: suggestion.title?.trim() || prev.title,
    genre: suggestion.genre?.trim() || prev.genre,
    tags: suggestion.tags?.trim() || prev.tags,
    style: suggestion.style?.trim() || prev.style,
    hook: suggestion.hook?.trim() || prev.hook,
    protagonist: suggestion.protagonist?.trim() || prev.protagonist,
    worldview: suggestion.worldview?.trim() || prev.worldview,
    synopsis: suggestion.synopsis?.trim() || prev.synopsis,
    sellingPoints: suggestion.sellingPoints?.trim() || prev.sellingPoints,
    targetChapterWords: suggestion.targetChapterWords || prev.targetChapterWords,
  }
}

export function hasDraftContent(form: NovelDraftForm): boolean {
  return Boolean(
    form.title.trim() ||
      form.genre.trim() ||
      form.tags.trim() ||
      form.style.trim() ||
      form.hook.trim() ||
      form.protagonist.trim() ||
      form.worldview.trim() ||
      form.synopsis.trim() ||
      form.sellingPoints.trim(),
  )
}

export function buildDraftPayload(form: NovelDraftForm, mode: 'generate' | 'optimize') {
  return {
    title: form.title.trim(),
    genre: form.genre.trim(),
    style: form.style.trim(),
    tags: form.tags.trim(),
    hook: form.hook.trim(),
    protagonist: form.protagonist.trim(),
    worldview: form.worldview.trim(),
    synopsis: form.synopsis.trim(),
    sellingPoints: form.sellingPoints.trim(),
    targetChapterWords: form.targetChapterWords,
    draft: assembleNovelDescription(form) || form.synopsis.trim(),
    mode,
  }
}
