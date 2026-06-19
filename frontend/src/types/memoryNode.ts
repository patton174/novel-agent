/** Memory tree node — scope = outermost root node title (user-defined, not fixed enum). */

export type MemoryScope = string
export type MemoryNodeKind = 'section' | 'leaf' | 'both'

export interface MemoryNodeStyle {
  layout?: string
  level?: number
  variant?: string
  icon?: string // Lucide PascalCase name, e.g. Globe, BookOpen
  accent?: string
  collapse_default?: boolean
  show_content_inline?: boolean
}

export interface MemoryNodeDTO {
  memory_id: string
  novel_id?: string
  scope: MemoryScope
  parent_id?: string | null
  sort_order: number
  title: string
  node_kind: MemoryNodeKind
  content?: string | null
  style?: MemoryNodeStyle | null
  meta?: Record<string, unknown> | null
  child_count?: number
}

/** Tree summary node from GET .../memory-nodes/tree */
export interface MemoryTreeNodeSummary {
  memory_id: string
  title: string
  sort_order: number
  node_kind: string
  child_count: number
  children?: MemoryTreeNodeSummary[]
}

export interface MemoryTreeResponse {
  scope: MemoryScope
  count: number
  nodes: MemoryTreeNodeSummary[]
}

/** One custom root category tab (scope key = normalized root title). */
export interface MemoryRootTab {
  scope: MemoryScope
  label: string
  count: number
  icon?: string | null
}

export type MemoryTreeIndex = Record<MemoryScope, MemoryTreeResponse>
