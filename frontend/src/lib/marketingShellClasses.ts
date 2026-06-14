import { cn } from '@/lib/utils'

/** 营销落地页根容器（原 MarketingPageWrapper） */
export const MARKETING_PAGE_WRAPPER = cn(
  'relative flex min-h-screen flex-col overflow-x-hidden bg-background [overflow-anchor:none]',
)

/** 营销页背景渐变层（原 MarketingBackgroundPattern） */
export const MARKETING_BACKGROUND_PATTERN = cn(
  'mkt-shell-bg-pattern pointer-events-none absolute inset-0',
)

/** 营销页主内容区（原 MarketingMain） */
export const MARKETING_MAIN = cn(
  'relative z-[1] flex flex-1 flex-col gap-0 pb-8 pt-0',
)
