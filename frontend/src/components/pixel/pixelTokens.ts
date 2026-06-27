/**
 * 管理台 Pixel UI token — 语义表面 + 主题色点缀（非 pastel 渐变）。
 * 明暗与 focus 对比度见 `styles/pixel-admin.css` 与 `PIXEL_FOCUS_RING`。
 */
import { cn } from '@/lib/utils'
import {
  EDITOR_PIXEL_CARD,
  EDITOR_PIXEL_INPUT,
  editorPixelButtonClass,
  editorPrimaryButtonClass,
  editorSecondaryButtonClass,
} from '@/lib/editorPixelClasses'
import { formFocusClass, formInputClass } from '@/components/shared/formControlTokens'

export {
  EDITOR_PIXEL_CARD,
  EDITOR_PIXEL_INPUT,
  editorPixelButtonClass,
  editorPrimaryButtonClass,
  editorSecondaryButtonClass,
}

/** 聚焦环：与 globals `--ring` / `--background` 联动 */
export const PIXEL_FOCUS_RING = formFocusClass

/** 图表容器 */
export const PIXEL_CHART_CARD = cn(
  'flex flex-col gap-3 rounded-lg border bg-[var(--pixel-surface)] p-4 md:p-5',
  'border-[var(--pixel-border-strong)]',
)

export const PIXEL_CHART_HEADER =
  'border-b border-[var(--pixel-border)] pb-2.5'

export const PIXEL_CHART_TITLE = 'text-sm font-semibold text-foreground'

export const PIXEL_CHART_DESC = 'mt-0.5 text-xs text-muted-foreground'

export const PIXEL_CHART_HEIGHT = 'h-52 w-full md:h-56'

export const PIXEL_CHART_HEIGHT_LG = 'h-56 w-full md:h-64'

/** 图表绘制区（透明，随卡片背景） */
export const PIXEL_CHART_PLOT = 'w-full min-w-0'

export const PIXEL_CHART_EMPTY = cn(
  PIXEL_CHART_HEIGHT,
  'flex items-center justify-center rounded-md border border-dashed border-[var(--pixel-border)]',
  'bg-[var(--pixel-panel-bg)] text-xs text-muted-foreground',
)

/** @deprecated 不再使用独立黑底画布 */
export const PIXEL_CHART_CANVAS = PIXEL_CHART_PLOT

/** 表格 — 标准 */
export const PIXEL_TABLE_WRAP = cn(
  'w-full overflow-x-auto rounded-lg border border-[var(--pixel-border-strong)] bg-[var(--pixel-surface)]',
)

export const PIXEL_TABLE_HEAD_ROW = cn(
  'border-b border-[var(--pixel-border)] bg-[var(--pixel-head-bg)]',
)

export const PIXEL_TABLE_HEAD_CELL = cn(
  'h-9 px-4 text-xs font-semibold normal-case tracking-normal text-[var(--pixel-head-fg)]',
)

export const PIXEL_TABLE_BODY_ROW = cn(
  'border-b border-[var(--pixel-border)] transition-colors',
  'hover:bg-[var(--pixel-row-hover)]',
  'even:bg-[var(--pixel-row-stripe)]',
  'data-[clickable=true]:cursor-pointer',
  'data-[clickable=true]:focus-visible:outline-none',
  'data-[clickable=true]:focus-visible:ring-2 data-[clickable=true]:focus-visible:ring-inset',
  'data-[clickable=true]:focus-visible:ring-ring/50',
)

export const PIXEL_TABLE_CELL = 'px-4 py-2.5 align-middle text-sm text-foreground'

export const PIXEL_TABLE_EMPTY = 'py-10 text-center text-sm text-muted-foreground'

/** 表格 — 紧凑（嵌套面板） */
export const PIXEL_TABLE_COMPACT_WRAP = cn(
  'w-full overflow-x-auto rounded-md border border-[var(--pixel-border)] bg-[var(--pixel-surface)]',
)

export const PIXEL_TABLE_COMPACT_HEAD_ROW =
  'border-b border-[var(--pixel-border)] bg-[var(--pixel-head-bg)]'

export const PIXEL_TABLE_COMPACT_HEAD_CELL = cn(
  'h-8 px-3 text-xs font-medium normal-case text-[var(--pixel-head-fg)]',
)

export const PIXEL_TABLE_COMPACT_BODY_ROW = cn(
  'border-b border-[var(--pixel-border)] hover:bg-[var(--pixel-row-hover)] even:bg-[var(--pixel-row-stripe)]',
)

export const PIXEL_TABLE_COMPACT_CELL = 'px-3 py-2 text-sm text-foreground'

export const PIXEL_TABLE_COMPACT_EMPTY = 'py-8 text-center text-sm text-muted-foreground'

/** 单元格排版 */
export const PIXEL_CELL_TITLE = 'font-medium leading-snug text-foreground'

export const PIXEL_CELL_SUBTITLE = 'mt-0.5 text-xs leading-snug text-muted-foreground'

export const PIXEL_CELL_MONO = 'font-mono text-xs tabular-nums text-foreground/85'

/** 表单控件 — 与 FormControls 统一 */
export const PIXEL_INPUT = formInputClass

export const PIXEL_SELECT_NATIVE = cn(formInputClass, 'appearance-none pr-9')

/** 管理台按钮叠加（配合 ProButton / PixelButton） */
export const PIXEL_BTN_ADMIN = cn(
  'border-[var(--pixel-border-strong)] font-medium normal-case tracking-normal shadow-none',
  'text-foreground hover:bg-[var(--pixel-row-hover)]',
  'active:translate-x-0 active:translate-y-0',
  PIXEL_FOCUS_RING,
)

/** 信息面板 / 弹窗块 */
export const PIXEL_PANEL = cn(
  'rounded-md border border-[var(--pixel-border)] bg-[var(--pixel-panel-bg)] p-3',
)

/** @deprecated 与 PIXEL_PANEL 合并，保留别名避免大范围替换 */
export const PIXEL_PANEL_SOFT = PIXEL_PANEL

export const PIXEL_LABEL = 'text-xs font-medium text-foreground/70'

export const PIXEL_CODE_BLOCK = cn(
  'overflow-auto rounded-md border border-[var(--pixel-border)] bg-[var(--pixel-code-bg)] p-3',
  'font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-[var(--pixel-code-fg)]',
)

/** 移动端卡片列表项 */
export const PIXEL_MOBILE_CARD = cn(
  'rounded-lg border border-[var(--pixel-border-strong)] bg-[var(--pixel-surface)] p-3 transition-colors',
  'hover:border-[var(--pixel-border-strong)] hover:bg-[var(--pixel-row-hover)]',
  PIXEL_FOCUS_RING,
)

export function pixelMobileCardClass(active?: boolean, className?: string) {
  return cn(
    PIXEL_MOBILE_CARD,
    active &&
      'border-primary/50 bg-[color-mix(in_srgb,var(--primary)_10%,var(--pixel-surface))] ring-2 ring-primary/35 ring-offset-2 ring-offset-background',
    className,
  )
}

/** 表格内操作条 */
export const PIXEL_TABLE_ACTION_BAR = 'flex flex-wrap items-center gap-1'

export type PixelBadgeTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted'
  | 'neon'
  | 'info'
  | 'purple'

export function pixelBadgeClass(
  tone: PixelBadgeTone = 'default',
  className?: string,
) {
  return cn(
    'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
    tone === 'default' &&
      'border-primary/35 bg-primary/10 text-primary dark:border-primary/45 dark:bg-primary/16 dark:text-[color-mix(in_srgb,var(--primary)_72%,white)]',
    tone === 'success' &&
      'border-success/40 bg-success/12 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/14 dark:text-emerald-200',
    tone === 'warning' &&
      'border-warning/45 bg-warning/14 text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/14 dark:text-amber-100',
    tone === 'danger' &&
      'border-destructive/40 bg-destructive/12 text-destructive dark:border-red-500/35 dark:bg-red-500/14 dark:text-red-200',
    tone === 'muted' &&
      'border-[var(--pixel-border-strong)] bg-muted text-foreground/80',
    tone === 'neon' &&
      'border-accent/50 bg-accent/16 text-accent-foreground',
    tone === 'info' &&
      'border-primary/35 bg-primary/10 text-primary dark:border-primary/45 dark:bg-primary/16 dark:text-[color-mix(in_srgb,var(--primary)_72%,white)]',
    tone === 'purple' &&
      'border-[color-mix(in_srgb,var(--chart-2)_45%,transparent)] bg-[color-mix(in_srgb,var(--chart-2)_14%,var(--pixel-surface))] text-foreground dark:text-[color-mix(in_srgb,var(--chart-2)_78%,white)]',
    className,
  )
}
