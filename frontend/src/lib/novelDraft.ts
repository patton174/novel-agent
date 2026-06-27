/** Fanqie-style create-novel draft fields + assembly for stored description. */

import i18n from '@/i18n'
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

export const NOVEL_GENRE_KEYS = [
  'xuanhuan',
  'qihuan',
  'xianxia',
  'dushi',
  'kehuan',
  'xuanyi',
  'lishi',
  'youxi',
  'tiyu',
  'zhutian',
] as const

export type NovelGenreKey = (typeof NOVEL_GENRE_KEYS)[number]

export const NOVEL_TAG_KEYS = [
  'shuangwen',
  'singleHeroine',
  'singleHero',
  'system',
  'rebirth',
  'transmigration',
  'survival',
  'invincible',
  'fastPaced',
] as const

export type NovelTagKey = (typeof NOVEL_TAG_KEYS)[number]

const NOVEL_DRAFT_SECTION_KEYS = [
  'hook',
  'synopsis',
  'worldview',
  'protagonist',
  'sellingPoints',
] as const

type NovelDraftSectionKey = (typeof NOVEL_DRAFT_SECTION_KEYS)[number]

/** Legacy Chinese section labels for parsing stored descriptions */
const LEGACY_SECTION_LABELS: Record<NovelDraftSectionKey, readonly string[]> = {
  hook: ['一句话卖点'],
  synopsis: ['简介'],
  worldview: ['世界观'],
  protagonist: ['主角'],
  sellingPoints: ['卖点'],
}

export function novelGenreLabel(key: string): string {
  return i18n.t(`dashboard:novelDraft.genres.${key}`, { defaultValue: key })
}

export function novelTagLabel(key: string): string {
  return i18n.t(`dashboard:novelDraft.tags.${key}`, { defaultValue: key })
}

export function getNovelGenreOptions(): readonly string[] {
  return NOVEL_GENRE_KEYS.map((key) => novelGenreLabel(key))
}

export function getNovelTagPresets(): readonly string[] {
  return NOVEL_TAG_KEYS.map((key) => novelTagLabel(key))
}

/** @deprecated use getNovelGenreOptions() */
export const NOVEL_GENRE_OPTIONS = NOVEL_GENRE_KEYS

/** @deprecated use getNovelTagPresets() */
export const NOVEL_TAG_PRESETS = NOVEL_TAG_KEYS

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

function sectionMarker(key: NovelDraftSectionKey): string {
  return i18n.t(`dashboard:novelDraft.sectionMarkers.${key}`)
}

export function assembleNovelDescription(
  form: Pick<NovelDraftForm, 'hook' | 'synopsis' | 'worldview' | 'protagonist' | 'sellingPoints'>,
): string {
  const parts: string[] = []
  if (form.hook.trim()) parts.push(`【${sectionMarker('hook')}】${form.hook.trim()}`)
  if (form.synopsis.trim()) parts.push(`【${sectionMarker('synopsis')}】\n${form.synopsis.trim()}`)
  if (form.worldview.trim()) parts.push(`【${sectionMarker('worldview')}】${form.worldview.trim()}`)
  if (form.protagonist.trim()) parts.push(`【${sectionMarker('protagonist')}】${form.protagonist.trim()}`)
  if (form.sellingPoints.trim()) {
    parts.push(`【${sectionMarker('sellingPoints')}】${form.sellingPoints.trim()}`)
  }
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractSection(desc: string, key: NovelDraftSectionKey): string {
  const labels = [sectionMarker(key), ...LEGACY_SECTION_LABELS[key]]
  for (const label of labels) {
    const re = new RegExp(`【${escapeRegExp(label)}】\\s*([\\s\\S]*?)(?=\\n\\n【|$)`)
    const match = desc.match(re)
    if (match?.[1]?.trim()) {
      return match[1].trim()
    }
  }
  return ''
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
    form.hook = extractSection(desc, 'hook')
    form.synopsis = extractSection(desc, 'synopsis')
    form.worldview = extractSection(desc, 'worldview')
    form.protagonist = extractSection(desc, 'protagonist')
    form.sellingPoints = extractSection(desc, 'sellingPoints')
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
