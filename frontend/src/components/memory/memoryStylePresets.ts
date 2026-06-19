/**
 * Memory layout presets — must stay in sync with
 * python-ai/app/agent/backend/memory_style_presets.py
 *
 * AI selects `layout` on CreateMemory style JSON; UI resolves CSS via resolveNodePresentation().
 */

import type { CSSProperties } from 'react'

import type { MemoryNodeStyle } from '../../types/memoryNode'
import { normalizeMemoryIconName } from './memoryNodeIcons'

export type MemoryLayoutPreset =
  | 'accordion'
  | 'outline'
  | 'cards'
  | 'timeline'
  | 'hero'
  | 'quote'
  | 'prose'

export type MemoryStyleVariant = 'default' | 'emphasis' | 'muted' | 'quote'

export type MemoryStyleAccent =
  | 'primary'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'sky'

export const MEMORY_LAYOUT_KEYS: MemoryLayoutPreset[] = [
  'accordion',
  'outline',
  'cards',
  'timeline',
  'hero',
  'quote',
  'prose',
]

export interface MemoryLayoutPresetDef {
  layout: MemoryLayoutPreset
  variant?: MemoryStyleVariant
  collapse_default?: boolean
  show_content_inline?: boolean
  aiHint: string
}

export const MEMORY_LAYOUT_PRESETS: Record<MemoryLayoutPreset, MemoryLayoutPresetDef> = {
  accordion: {
    layout: 'accordion',
    variant: 'default',
    collapse_default: false,
    show_content_inline: false,
    aiHint: 'Multi-level worldview / outline sections; collapsible hierarchy.',
  },
  outline: {
    layout: 'outline',
    variant: 'default',
    collapse_default: true,
    show_content_inline: false,
    aiHint: 'Deep nesting (depth≥2); indented outline like a table of contents.',
  },
  cards: {
    layout: 'cards',
    variant: 'emphasis',
    collapse_default: false,
    show_content_inline: true,
    aiHint: 'Sibling items at same level (characters, parallel settings).',
  },
  timeline: {
    layout: 'timeline',
    variant: 'default',
    collapse_default: false,
    show_content_inline: true,
    aiHint: 'Chronological novel outline or history sections.',
  },
  hero: {
    layout: 'hero',
    variant: 'emphasis',
    collapse_default: false,
    show_content_inline: true,
    aiHint: 'Scope root with overview content (node_kind=both).',
  },
  quote: {
    layout: 'quote',
    variant: 'muted',
    collapse_default: false,
    show_content_inline: true,
    aiHint: 'Short leaf excerpt (<400 chars), pull-quote style.',
  },
  prose: {
    layout: 'prose',
    variant: 'default',
    collapse_default: false,
    show_content_inline: true,
    aiHint: 'Default long-form Markdown leaf; omit style or use this.',
  },
}

export const DEFAULT_SCOPE_LAYOUT: Record<string, MemoryLayoutPreset> = {}

/** Fields mirrored in Python SYNC_PRESET_FIELDS / preset_sync_manifest(). */
export const SYNC_PRESET_FIELDS = [
  'layout',
  'variant',
  'collapse_default',
  'show_content_inline',
] as const

export function presetSyncManifest(): Array<Record<(typeof SYNC_PRESET_FIELDS)[number], unknown>> {
  return MEMORY_LAYOUT_KEYS.map((key) => {
    const preset = MEMORY_LAYOUT_PRESETS[key]
    return {
      layout: preset.layout,
      variant: preset.variant,
      collapse_default: preset.collapse_default,
      show_content_inline: preset.show_content_inline,
    }
  })
}

export interface NodePresentation {
  layout: MemoryLayoutPreset
  containerClass: string
  titleClass: string
  contentClass: string
  childContainerClass: string
  showContentInline: boolean
  collapseDefault: boolean
  icon?: string
  accentClass: string
  accentStyle?: CSSProperties
  levelIndentClass: string
}

const LAYOUT_CONTAINER: Record<MemoryLayoutPreset, string> = {
  accordion: 'rounded-xl border border-border/50 bg-card/30 overflow-hidden shadow-sm',
  outline: 'border-l-2 border-primary/25 pl-3',
  cards: 'rounded-xl border border-border/45 bg-card/60 shadow-sm',
  timeline: 'relative pl-4 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-border/80',
  hero: 'rounded-xl border border-border/40 bg-gradient-to-br from-muted/50 via-card/40 to-transparent px-4 py-3',
  quote: 'rounded-lg border-l-[3px] border-primary/30 bg-muted/20 px-3 py-2.5',
  prose: 'rounded-xl bg-muted/15 px-3 py-2.5 ring-1 ring-border/40',
}

const LAYOUT_TITLE: Record<MemoryLayoutPreset, string> = {
  accordion: 'text-[14px] font-semibold text-foreground px-3 py-2 border-b border-border/40 bg-muted/20',
  outline: 'text-[14px] font-semibold text-foreground',
  cards: 'text-[14px] font-semibold text-foreground',
  timeline: 'text-[14px] font-semibold text-foreground',
  hero: 'text-[16px] font-bold tracking-tight text-foreground',
  quote: 'text-[13px] font-medium text-foreground not-italic',
  prose: 'text-[14px] font-semibold text-foreground',
}

const ACCENT_BORDER_CLASS: Record<MemoryStyleAccent, string> = {
  primary: 'border-primary/50',
  emerald: 'border-emerald-500/50',
  amber: 'border-amber-500/50',
  rose: 'border-rose-500/50',
  violet: 'border-violet-500/50',
  sky: 'border-sky-500/50',
}

export function normalizeLayout(raw?: string | null): MemoryLayoutPreset {
  const key = (raw || 'prose').trim().toLowerCase() as MemoryLayoutPreset
  return key in MEMORY_LAYOUT_PRESETS ? key : 'prose'
}

export function resolveDefaultLayout(
  style: MemoryNodeStyle | null | undefined,
  opts: { scope?: string; depth?: number; nodeKind?: string; isRoot?: boolean },
): MemoryLayoutPreset {
  if (style?.layout) {
    return normalizeLayout(style.layout)
  }
  if (opts.isRoot && (opts.nodeKind === 'both' || opts.nodeKind === 'section')) {
    return 'hero'
  }
  if ((opts.depth ?? 0) >= 2) {
    return 'outline'
  }
  if (opts.scope && DEFAULT_SCOPE_LAYOUT[opts.scope]) {
    return DEFAULT_SCOPE_LAYOUT[opts.scope]
  }
  return 'prose'
}

function resolveAccent(accent?: string | null): { accentClass: string; accentStyle?: CSSProperties } {
  if (!accent) {
    return { accentClass: '' }
  }
  const trimmed = accent.trim()
  const named = trimmed.toLowerCase() as MemoryStyleAccent
  if (named in ACCENT_BORDER_CLASS) {
    return { accentClass: ACCENT_BORDER_CLASS[named] }
  }
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    return { accentClass: 'border-opacity-80', accentStyle: { borderColor: trimmed } }
  }
  return { accentClass: '' }
}

function variantContainerClass(variant: MemoryStyleVariant): string {
  if (variant === 'emphasis') {
    return ' ring-1 ring-primary/10'
  }
  if (variant === 'muted') {
    return ' opacity-95'
  }
  return ''
}

function variantTitleClass(variant: MemoryStyleVariant): string {
  if (variant === 'muted') {
    return ' text-muted-foreground'
  }
  return ''
}

function levelIndentClass(level?: number | null): string {
  if (level == null || level <= 0) {
    return ''
  }
  const capped = Math.min(8, Math.max(0, level))
  const map: Record<number, string> = {
    1: 'ml-1',
    2: 'ml-2',
    3: 'ml-3',
    4: 'ml-4',
    5: 'ml-5',
    6: 'ml-6',
    7: 'ml-7',
    8: 'ml-8',
  }
  return map[capped] ?? ''
}

export function resolveNodePresentation(
  style: MemoryNodeStyle | null | undefined,
  opts: { scope?: string; depth?: number; nodeKind?: string; isRoot?: boolean },
): NodePresentation {
  const layout = resolveDefaultLayout(style, opts)
  const preset = MEMORY_LAYOUT_PRESETS[layout]
  const variant = (style?.variant ?? preset.variant ?? 'default') as MemoryStyleVariant
  const { accentClass, accentStyle } = resolveAccent(style?.accent)
  const icon = normalizeMemoryIconName(style?.icon) ?? undefined
  const levelIndent = levelIndentClass(style?.level ?? null)

  return {
    layout,
    containerClass: LAYOUT_CONTAINER[layout] + variantContainerClass(variant) + (accentClass ? ` ${accentClass}` : ''),
    titleClass: LAYOUT_TITLE[layout] + variantTitleClass(variant),
    contentClass:
      'text-[13px] leading-relaxed text-foreground agent-prose agent-prose-memory' +
      (variant === 'muted' ? ' text-muted-foreground' : ''),
    childContainerClass:
      layout === 'cards'
        ? 'grid gap-2 sm:grid-cols-2 mt-2'
        : layout === 'timeline'
          ? 'mt-2 flex flex-col gap-3'
          : 'mt-2 flex flex-col gap-2 ml-0.5',
    showContentInline: style?.show_content_inline ?? preset.show_content_inline ?? true,
    collapseDefault: style?.collapse_default ?? preset.collapse_default ?? false,
    icon,
    accentClass,
    accentStyle,
    levelIndentClass: levelIndent,
  }
}

/** Markdown block for AI tool docs (mirrors Python memory_style_prompt_block). */
export function memoryStyleGuideForDocs(): string {
  return Object.entries(MEMORY_LAYOUT_PRESETS)
    .map(([k, v]) => `- \`${k}\`: ${v.aiHint}`)
    .join('\n')
}
