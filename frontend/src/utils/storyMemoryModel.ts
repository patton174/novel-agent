import type {
  MemoryDocumentV1,
  MemoryTabId,
  NormalizedStoryMemory,
  StoryMemoryField,
  StoryMemoryFieldFormat,
  StoryMemoryGroup,
  StoryMemoryWire,
} from '../types/storyMemory'
import { CHARACTER_FIELD_ORDER, STORY_MEMORY_VERSION } from '../types/storyMemory'

const BODY_FIELD_KEYS = new Set(['正文', 'body', 'content'])

function fieldFormat(key: string): StoryMemoryFieldFormat {
  if (BODY_FIELD_KEYS.has(key)) {
    return 'markdown'
  }
  if (key === '摘要' && key.length <= 4) {
    return 'markdown'
  }
  return 'markdown'
}

function sortFields(fields: StoryMemoryField[]): StoryMemoryField[] {
  const order = new Map(CHARACTER_FIELD_ORDER.map((k, i) => [k, i]))
  return [...fields].sort((a, b) => {
    const ai = order.get(a.key as (typeof CHARACTER_FIELD_ORDER)[number]) ?? 999
    const bi = order.get(b.key as (typeof CHARACTER_FIELD_ORDER)[number]) ?? 999
    if (ai !== bi) return ai - bi
    return a.key.localeCompare(b.key, 'zh-CN')
  })
}

function makeField(key: string, value: string): StoryMemoryField {
  const k = key.trim()
  const v = value.trim()
  return { key: k, value: v, format: fieldFormat(k) }
}

function fieldsFromMemoryDocument(
  doc: MemoryDocumentV1,
  character: boolean,
): StoryMemoryField[] {
  const fields: StoryMemoryField[] = []
  if (doc.summary?.trim()) {
    fields.push(makeField('摘要', doc.summary.trim()))
  }
  const data = doc.data ?? {}
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue
    if (typeof value === 'object') continue
    const text = String(value).trim()
    if (!text) continue
    const k = key === 'body' ? '正文' : key
    if (!fields.some((f) => f.key === k)) {
      fields.push(makeField(k, text))
    }
  }
  return character ? sortFields(fields) : fields.sort((a, b) => a.key.localeCompare(b.key, 'zh-CN'))
}

function fieldsFromStoredValue(raw: string, character: boolean): StoryMemoryField[] {
  const text = (raw || '').trim()
  if (!text) return []
  if (text.startsWith('{')) {
    try {
      const doc = JSON.parse(text) as MemoryDocumentV1
      if (doc?.v === 1 && doc.data && typeof doc.data === 'object') {
        return fieldsFromMemoryDocument(doc, character)
      }
    } catch {
      /* legacy */
    }
  }
  if (character) {
    return expandCharacterCard({ 正文: text })
  }
  return [makeField('正文', text)]
}

function groupsFromFlatRecord(record: Record<string, string> | undefined): StoryMemoryGroup[] {
  if (!record) return []
  return Object.entries(record)
    .filter(([id]) => id.trim())
    .map(([id, raw]) => ({
      id: id.trim(),
      fields: fieldsFromStoredValue(String(raw ?? ''), false),
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'zh-CN'))
}

function expandCharacterCard(raw: Record<string, string>): StoryMemoryField[] {
  const fields: StoryMemoryField[] = []
  const cardRaw = (raw['人物卡'] || '').trim()
  if (cardRaw.startsWith('{')) {
    try {
      const parsed = JSON.parse(cardRaw) as Record<string, unknown>
      for (const [key, value] of Object.entries(parsed)) {
        if (value == null) continue
        const t = String(value).trim()
        if (t) fields.push(makeField(key, t))
      }
    } catch {
      if (cardRaw) fields.push(makeField('人物卡', cardRaw))
    }
  } else if (cardRaw) {
    fields.push(makeField('人物卡', cardRaw))
  }
  for (const [key, value] of Object.entries(raw)) {
    if (key === '人物卡') continue
    const t = String(value ?? '').trim()
    if (!t) continue
    if (!fields.some((f) => f.key === key)) {
      fields.push(makeField(key, t))
    }
  }
  return sortFields(fields)
}

const CHAPTER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function titleFromChapterSummaryText(summary: string): string {
  const text = (summary || '').trim()
  if (!text) return ''
  const heading = text.match(/^#\s*(.+?)(?:\s*摘要)?\s*$/m)
  if (heading) {
    return heading[1].trim()
  }
  const book = text.match(/《([^》]+)》/)
  if (book) {
    return `《${book[1]}》`
  }
  return ''
}

function pickChapterMemoryTitle(
  chapterId: string,
  attrs: Record<string, string>,
  fields: StoryMemoryField[],
): string {
  const fromAttr = (attrs.title || attrs.Title || '').trim()
  if (fromAttr && !CHAPTER_UUID_RE.test(fromAttr)) {
    return fromAttr
  }
  for (const field of fields) {
    if (field.key === 'title' && field.value.trim() && !CHAPTER_UUID_RE.test(field.value)) {
      return field.value.trim()
    }
  }
  const summary = fields.find((f) => f.key === '摘要')?.value ?? ''
  const fromSummary = titleFromChapterSummaryText(summary)
  if (fromSummary) {
    return fromSummary
  }
  return CHAPTER_UUID_RE.test(chapterId) ? '章节记忆' : chapterId
}

function groupsFromChapterMemory(
  record: Record<string, Record<string, string>> | undefined,
): StoryMemoryGroup[] {
  if (!record) return []
  return Object.entries(record)
    .filter(([id]) => id.trim())
    .map(([id, attrs]) => {
      const safe = attrs ?? {}
      let fields: StoryMemoryField[] = []
      for (const value of Object.values(safe)) {
        const raw = String(value ?? '').trim()
        if (raw.startsWith('{')) {
          try {
            const doc = JSON.parse(raw) as MemoryDocumentV1
            if (doc?.v === 1 && doc.data && typeof doc.data === 'object') {
              fields = fieldsFromMemoryDocument(doc, false)
              break
            }
          } catch {
            /* legacy flat */
          }
        }
      }
      if (fields.length === 0) {
        fields = flatFromRecord(safe)
      }
      const displayTitle = pickChapterMemoryTitle(id.trim(), safe, fields)
      return {
        id: id.trim(),
        displayTitle,
        fields,
      }
    })
    .sort((a, b) =>
      (a.displayTitle || a.id).localeCompare(b.displayTitle || b.id, 'zh-CN'),
    )
}

function groupsFromRecord(
  record: Record<string, Record<string, string>> | undefined,
  character: boolean,
): StoryMemoryGroup[] {
  if (!record) return []
  return Object.entries(record)
    .filter(([id]) => id.trim())
    .map(([id, attrs]) => ({
      id: id.trim(),
      fields: character ? expandCharacterCard(attrs ?? {}) : flatFromRecord(attrs),
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'zh-CN'))
}

function flatFromRecord(record: Record<string, string> | undefined): StoryMemoryField[] {
  if (!record) return []
  return Object.entries(record)
    .filter(([key, value]) => key.trim() && String(value ?? '').trim())
    .map(([key, value]) => makeField(key, String(value)))
    .sort((a, b) => a.key.localeCompare(b.key, 'zh-CN'))
}

export function emptyNormalizedStoryMemory(): NormalizedStoryMemory {
  return {
    version: STORY_MEMORY_VERSION,
    novel: [],
    world: [],
    background: [],
    characters: [],
    chapters: [],
  }
}

export function normalizeStoryMemory(wire: StoryMemoryWire | null | undefined): NormalizedStoryMemory {
  if (!wire) return emptyNormalizedStoryMemory()
  return {
    version: STORY_MEMORY_VERSION,
    novel: groupsFromFlatRecord(wire.novel),
    world: groupsFromFlatRecord(wire.world),
    background: groupsFromFlatRecord(wire.background),
    characters: groupsFromRecord(wire.characters, true),
    chapters: groupsFromChapterMemory(wire.chapters),
  }
}

export function countTabEntries(memory: NormalizedStoryMemory, tab: MemoryTabId): number {
  switch (tab) {
    case 'novel':
      return memory.novel.length
    case 'world':
      return memory.world.length
    case 'background':
      return memory.background.length
    case 'characters':
      return memory.characters.length
    case 'chapters':
      return memory.chapters.length
    default:
      return 0
  }
}

export function characterPreview(group: StoryMemoryGroup): { roleLabel: string; summary: string } {
  const byKey = new Map(group.fields.map((f) => [f.key, f.value]))
  const identity = (byKey.get('身份') || '').trim()
  const personality = (byKey.get('性格') || '').trim()
  const summaryField = (byKey.get('摘要') || '').trim()
  const parts = [personality].filter(Boolean)
  return {
    roleLabel: identity || '角色',
    summary: parts.join(' · ') || summaryField.slice(0, 140) || '暂无摘要',
  }
}

/** 世界观/大纲/背景等仅一条正文时，UI 可全宽 Markdown 不重复显示「正文」标签 */
export function isBodyOnlyGroup(group: StoryMemoryGroup): boolean {
  if (group.fields.length !== 1) return false
  return BODY_FIELD_KEYS.has(group.fields[0].key)
}

export function groupToWireRecord(group: StoryMemoryGroup): Record<string, string> {
  const out: Record<string, string> = {}
  for (const field of group.fields) {
    const key = field.key.trim()
    const value = field.value.trim()
    if (key && value) out[key] = value
  }
  return out
}

export function flatToWireRecord(fields: StoryMemoryField[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const field of fields) {
    const key = field.key.trim()
    const value = field.value.trim()
    if (key && value) out[key] = value
  }
  return out
}
