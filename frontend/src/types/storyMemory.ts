/** Canonical story-memory document (UI + API normalization). */

export const STORY_MEMORY_VERSION = 1 as const

/** Agent Write / Read envelope for memory/*.json (Python memory_document.py). */
export interface MemoryDocumentV1 {
  v: 1
  title?: string
  summary?: string
  data: Record<string, unknown>
}

export type MemoryTabId = 'novel' | 'world' | 'characters' | 'background' | 'chapters'

/** Agent/content API scope (singular). */
export type MemoryApiScope = 'novel' | 'world' | 'background' | 'character' | 'chapter'

/** 字段值展示格式：角色/世界观/章节等正文类字段用 Markdown 渲染 */
export type StoryMemoryFieldFormat = 'markdown' | 'plain'

export interface StoryMemoryField {
  key: string
  value: string
  format?: StoryMemoryFieldFormat
}

/** 与 Python memory_schema.CHARACTER_REQUIRED_DATA_KEYS 对齐 */
export const CHARACTER_REQUIRED_KEYS = ['身份', '性格'] as const

export const CHAPTER_REQUIRED_KEYS = ['摘要'] as const

export interface StoryMemoryGroup {
  id: string
  /** 章节记忆等：展示用标题（存储 key 仍为 id / UUID） */
  displayTitle?: string
  fields: StoryMemoryField[]
}

export interface NormalizedStoryMemory {
  version: typeof STORY_MEMORY_VERSION
  novel: StoryMemoryGroup[]
  world: StoryMemoryGroup[]
  background: StoryMemoryGroup[]
  characters: StoryMemoryGroup[]
  chapters: StoryMemoryGroup[]
}

/** Wire shape from GET /api/agent/memory/novel/{id} */
export interface StoryMemoryWire {
  novel: Record<string, string>
  world: Record<string, string>
  background: Record<string, string>
  characters: Record<string, Record<string, string>>
  chapters: Record<string, Record<string, string>>
}

export interface StoryMemoryPatchRequest {
  scope: MemoryApiScope
  key: string
  value: string
  item_id?: string
}

export interface StoryMemoryDeleteRequest {
  scope: MemoryApiScope
  key: string
  item_id?: string
}

export interface StoryMemoryClearRequest {
  scope: MemoryApiScope
}

export const MEMORY_TAB_SCOPE: Record<MemoryTabId, MemoryApiScope> = {
  novel: 'novel',
  world: 'world',
  background: 'background',
  characters: 'character',
  chapters: 'chapter',
}

/** Preferred field order for character cards in the editor. */
export const CHARACTER_FIELD_ORDER = [
  '身份',
  '性格',
  '外貌',
  '能力',
  '能力体系',
  '核心动机',
  '立场',
  '剧情价值',
  '隐藏秘密',
] as const
