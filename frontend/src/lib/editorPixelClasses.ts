/**
 * 编辑页 Neo-Brutalist / 像素风格 token 源。
 * 对齐 marketingOrchestrationDemoClasses + AppPageStack。
 */
import { cn } from '@/lib/utils'

/** 编辑页根作用域 */
export const EDITOR_PIXEL_ROOT = 'editor-pixel bg-background text-foreground'

/** 页面/列容器 */
export const EDITOR_PIXEL_SHELL = 'flex h-full min-h-0 flex-col overflow-hidden bg-background'

/** 标准卡片：黑边 + 硬阴影 */
export const EDITOR_PIXEL_CARD = cn(
  'border-2 border-foreground bg-background shadow-soft',
)

export const EDITOR_PIXEL_CARD_INSET = cn(EDITOR_PIXEL_CARD, 'p-3')

/** 侧栏 */
export const EDITOR_PIXEL_SIDEBAR = cn(
  'flex h-full w-[284px] shrink-0 flex-col border-r-2 border-foreground bg-background',
)

export const EDITOR_PIXEL_SIDEBAR_SECTION = 'border-b-2 border-foreground/20 px-3 py-2'

export function editorPixelNavItemClass(active?: boolean, className?: string) {
  return cn(
    'flex w-full items-center gap-2 border-2 border-transparent px-2.5 py-2',
    'font-mono text-xs font-bold uppercase tracking-wide transition-colors',
    active
      ? 'border-foreground bg-neon text-ink shadow-[2px_2px_0_0_var(--foreground)]'
      : 'text-muted-foreground hover:border-foreground/40 hover:bg-muted/50 hover:text-foreground',
    className,
  )
}

export function editorPixelSessionItemClass(active?: boolean, className?: string) {
  return cn(
    'flex w-full items-center gap-2 px-2 py-1.5 font-mono text-[0.72rem] transition-colors',
    active
      ? 'border-l-2 border-l-primary bg-neon/25 font-bold text-foreground'
      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
    className,
  )
}

/** Tab 条 */
export const EDITOR_PIXEL_TAB_TRACK = 'inline-flex items-center gap-1 border-2 border-foreground bg-background p-0.5 shadow-soft'

export function editorPixelTabClass(active?: boolean, className?: string) {
  return cn(
    'inline-flex h-8 items-center gap-1.5 px-3 font-mono text-xs font-bold uppercase tracking-wide transition-colors',
    active
      ? 'bg-neon text-ink'
      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
    className,
  )
}

/** Composer */
export const EDITOR_PIXEL_COMPOSER_WRAP = cn(
  'w-full min-w-0 border-2 border-foreground bg-background px-2 pb-1.5 pt-1.5 shadow-[2px_2px_0_0_var(--foreground)]',
  'md:pb-2 md:pt-2 md:shadow-[3px_3px_0_0_var(--foreground)]',
)

export const EDITOR_PIXEL_COMPOSER_TEXT = cn(
  'min-h-10 whitespace-pre-wrap px-1 py-1 font-mono text-[0.82rem] leading-[1.45] text-foreground',
)

export function editorPixelSendButtonClass(streaming?: boolean, className?: string) {
  return cn(
    'relative inline-flex size-[34px] shrink-0 items-center justify-center overflow-hidden border-2 border-foreground transition-[background,opacity,transform] duration-[120ms]',
    '[&_svg]:size-[17px]',
    streaming
      ? 'bg-destructive text-destructive-foreground shadow-[2px_2px_0_0_var(--foreground)]'
      : 'bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--foreground)]',
    'disabled:cursor-not-allowed disabled:opacity-45',
    className,
  )
}

/** 用户消息气泡 — 固定 max-width，勿用百分比 max-w（与 w-fit 父级会形成宽度塌陷） */
export const EDITOR_PIXEL_USER_BUBBLE = cn(
  'inline-block w-max max-w-[22rem] shrink-0 border-2 border-foreground bg-neon/20 px-2.5 py-1.5',
  'whitespace-pre-wrap break-normal font-mono text-[0.72rem] leading-[1.5] text-foreground shadow-[2px_2px_0_0_var(--foreground)]',
  'md:max-w-[26rem] md:px-3 md:py-2 md:text-[0.82rem]',
)

/** Story 正文 */
export const EDITOR_PIXEL_COMPOSER_ACTION_ROW =
  'flex items-center justify-between gap-2.5'

export const EDITOR_PIXEL_HOST_MODE = cn(
  'inline-flex items-center gap-1.5 font-mono text-[0.7rem] font-bold uppercase tracking-wide text-foreground/80',
)

export const EDITOR_PIXEL_STORY_BODY = cn(
  'min-h-full w-full resize-none border-none bg-transparent font-mono text-[0.9rem] leading-[1.72] tracking-normal text-foreground outline-none whitespace-pre-wrap',
)

export const EDITOR_PIXEL_STORY_TOOLBAR = cn(
  'flex shrink-0 items-center gap-2 border-b-2 border-foreground px-3 py-2',
)

/** 大纲 */
export function editorPixelVolumeBlockClass(dragOver?: boolean) {
  return cn(
    'flex flex-col gap-1 border-2 border-foreground bg-background p-2 shadow-soft transition-colors',
    dragOver && 'bg-neon/30',
  )
}

export function editorPixelOutlineItemClass(opts?: { active?: boolean; dragOver?: boolean }) {
  const { active, dragOver } = opts ?? {}
  return cn(
    'border-2 border-transparent transition-colors',
    dragOver && 'border-foreground bg-neon/25',
    active && 'border-foreground bg-neon/20',
  )
}

/** 弹窗 */
export const EDITOR_PIXEL_MODAL_PANEL = cn(
  'flex flex-col overflow-hidden border-2 border-foreground bg-background shadow-soft',
  'max-md:h-full max-md:w-full max-md:rounded-none',
)

export const EDITOR_PIXEL_MODAL_HEADER = cn(
  'flex shrink-0 items-start justify-between gap-4 border-b-2 border-foreground px-4 py-3',
)

export const EDITOR_PIXEL_ORCH_TIMELINE =
  'flex w-full max-w-full flex-col gap-2 overflow-visible py-1'

export const EDITOR_PIXEL_ORCH_STATUS_LINE = cn(
  'flex items-center gap-2 font-mono text-[0.78rem] font-bold uppercase tracking-wide text-muted-foreground',
)

export const EDITOR_PIXEL_ORCH_STEP_TITLE = cn(
  'flex min-h-[1.3rem] items-center gap-2 font-mono text-[0.78rem] font-bold text-foreground',
)

export const EDITOR_PIXEL_ORCH_STEP_META =
  'hidden font-mono text-[0.72rem] font-normal text-muted-foreground sm:inline'

export const EDITOR_PIXEL_ORCH_THINK_BODY = cn(
  'mt-1 max-w-[92%] font-mono text-[0.78rem] leading-[1.55] text-muted-foreground',
)

/** 编排区 — 对齐 ORCH_DEMO */
export const EDITOR_PIXEL_TIMELINE_TITLE = EDITOR_PIXEL_ORCH_STEP_TITLE

export const EDITOR_PIXEL_TIMELINE_BODY = EDITOR_PIXEL_ORCH_THINK_BODY

export const EDITOR_PIXEL_TIMELINE_NARRATION = cn(
  'min-w-0 flex-1 font-mono text-[0.86rem] leading-[1.72] text-foreground',
)

export const EDITOR_PIXEL_TOOL_ROW = cn(
  'flex min-h-[1.35rem] w-full flex-nowrap items-center gap-x-2 gap-y-0 font-mono text-[0.78rem] font-semibold text-muted-foreground',
)

export const EDITOR_PIXEL_TOOL_NAME = cn(
  'font-mono text-[0.78rem] font-semibold text-muted-foreground',
)

export const EDITOR_PIXEL_ORCH_HEADLINE = cn(
  'font-mono text-[0.78rem] font-bold text-foreground',
)

export const EDITOR_PIXEL_ORCH_EMPTY_HINT = cn(
  'flex items-center gap-2 font-mono text-[0.74rem] text-muted-foreground',
)

export const EDITOR_PIXEL_ORCH_TIMELINE_GAP = 'flex w-full max-w-full flex-col gap-2 py-1'

export const EDITOR_PIXEL_DELIVERY = cn(
  'm-0 mt-4 w-full max-w-full border-2 border-foreground bg-background px-3 py-2 font-mono text-[0.86rem] leading-[1.72] text-foreground shadow-[2px_2px_0_0_var(--foreground)]',
)

export function editorPixelThinkBlockClass(expanded?: boolean) {
  return cn(
    'overflow-visible border-2 border-foreground bg-background px-2 py-1',
    expanded && 'border-l-[3px] border-l-foreground bg-neon/10 pl-2.5',
  )
}

export function editorPixelSubagentWrapClass(active?: boolean) {
  return cn(
    'border-2 border-dashed border-foreground bg-muted/30 p-2',
    active && 'border-solid bg-neon/10',
  )
}

export function editorPixelChoiceButtonClass(active?: boolean, className?: string) {
  return cn(
    'm-0 flex w-full cursor-pointer flex-col items-start gap-[0.12rem] border-2 border-foreground p-2 text-left font-mono transition-colors',
    'hover:enabled:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-55',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
    active ? 'bg-neon text-ink shadow-[2px_2px_0_0_var(--foreground)]' : 'bg-background',
    className,
  )
}

export function editorPixelStatusIconClass(status: 'loading' | 'success' | 'error' | 'idle') {
  return cn(
    'inline-flex size-5 shrink-0 items-center justify-center border border-foreground',
    status === 'loading' && 'bg-muted text-muted-foreground',
    status === 'success' && 'bg-primary text-primary-foreground',
    status === 'error' && 'bg-destructive text-destructive-foreground',
    status === 'idle' && 'bg-background text-muted-foreground',
  )
}

export function editorPixelSubagentDotClass(active?: boolean) {
  return cn(
    'size-2 shrink-0 border border-foreground',
    active ? 'bg-neon' : 'bg-muted-foreground/50',
  )
}

export const EDITOR_PIXEL_CHAT_SURFACE = cn(
  'w-full max-w-full box-border border-2 border-foreground bg-background shadow-soft',
)

export const EDITOR_PIXEL_MONO_WRAP = 'font-mono tracking-normal'

export function editorPixelIconButtonClass(className?: string) {
  return cn(
    'inline-flex size-8 shrink-0 items-center justify-center border-2 border-foreground bg-background text-muted-foreground shadow-soft',
    'hover:bg-neon/30 hover:text-foreground',
    className,
  )
}

export function editorPrimaryButtonClass(className?: string) {
  return cn(
    'rounded-none border-2 border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--foreground)]',
    'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45',
    className,
  )
}

export function editorSecondaryButtonClass(className?: string) {
  return cn(
    'rounded-none border-2 border-foreground bg-background font-mono text-xs font-bold uppercase tracking-wide text-foreground shadow-soft',
    'hover:bg-neon/30 disabled:cursor-not-allowed disabled:opacity-45',
    className,
  )
}

export function editorPixelButtonClass(active?: boolean, className?: string) {
  return cn(
    'inline-flex items-center justify-center border-2 border-foreground bg-background px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide shadow-soft transition-colors',
    active ? 'bg-neon text-ink' : 'text-foreground hover:bg-neon/30',
    className,
  )
}

export const EDITOR_PIXEL_INPUT = cn(
  'w-full border-2 border-foreground bg-background px-2 py-1.5 font-mono text-[0.82rem] text-foreground shadow-[1px_1px_0_0_var(--foreground)]',
  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40',
)

export const EDITOR_PIXEL_DIVIDER = 'my-2 border-t-2 border-foreground/20'
