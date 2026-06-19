/** Fanqie-style create-novel draft fields + assembly for stored description. */

import type { CreateNovelPayload } from '@/types/novel'

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

function extractSection(desc: string, label: string): string {
  const re = new RegExp(`【${label}】\\s*([\\s\\S]*?)(?=\\n\\n【|$)`)
  const match = desc.match(re)
  return match?.[1]?.trim() ?? ''
}

/** 将已存储小说字段还原为创建/编辑表单 */
export function novelToDraftForm(novel: {
  title: string
  description?: string | null
  genre?: string | null
  style?: string | null
  targetChapterWords?: number
}): NovelDraftForm {
  const form = emptyNovelDraftForm()
  form.title = novel.title
  form.genre = novel.genre?.trim() ?? ''
  form.targetChapterWords = novel.targetChapterWords ?? 3000

  const styleRaw = novel.style?.trim() ?? ''
  if (styleRaw.includes(' · ')) {
    const [stylePart, ...tagParts] = styleRaw.split(' · ')
    form.style = stylePart.trim()
    form.tags = tagParts.join(' · ').trim()
  } else {
    form.style = styleRaw
  }

  const desc = novel.description?.trim() ?? ''
  if (desc) {
    form.hook = extractSection(desc, '一句话卖点')
    form.synopsis = extractSection(desc, '简介')
    form.worldview = extractSection(desc, '世界观')
    form.protagonist = extractSection(desc, '主角')
    form.sellingPoints = extractSection(desc, '卖点')
    if (!form.synopsis && !form.hook && !form.worldview) {
      form.synopsis = desc
    }
  }

  return form
}

export function draftFormToPayload(form: NovelDraftForm): CreateNovelPayload {
  const description =
    assembleNovelDescription(form) || form.synopsis.trim() || undefined
  const styleCombined = [form.style.trim(), form.tags.trim()]
    .filter(Boolean)
    .join(' · ')
  return {
    title: form.title.trim(),
    description,
    genre: form.genre.trim() || undefined,
    style: styleCombined || undefined,
    targetChapterWords: form.targetChapterWords || 3000,
  }
}
