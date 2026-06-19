import { cn } from '@/lib/utils'

/** 侧栏行：图标列 26px + gap 6px，与小说卡片对齐 */
export const SIDEBAR_ICON_PX = 26
export const SIDEBAR_ROW_PAD = 'pl-1.5 pr-1'
export const SIDEBAR_ICON_CELL = cn(
  'flex size-[26px] shrink-0 items-center justify-center',
)
export const SIDEBAR_ROW = cn('flex w-full items-center gap-1.5', SIDEBAR_ROW_PAD)
export const SIDEBAR_TITLE = 'truncate text-[13px] font-semibold leading-snug text-foreground'
export const SIDEBAR_META = 'shrink-0 text-[10px] font-normal leading-none text-muted-foreground/70'
/** 分组标题 / 正文与小说标题左缘对齐 */
export const SIDEBAR_BODY_INDENT = 'pl-[calc(0.375rem+26px+0.375rem)]'
