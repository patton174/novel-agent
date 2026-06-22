import { cn } from '@/lib/utils'

/** 子页区块：与首页一致的 Neo-Brutalism 卡片 */
export const MKT_SURFACE_CARD = cn(
  'border-2 border-foreground bg-surface shadow-soft',
)

export const MKT_SURFACE_CARD_PAD = cn(MKT_SURFACE_CARD, 'p-5 md:p-6')

export const MKT_SECTION_WRAP = 'mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20'

export const MKT_EYEBROW = cn(
  'inline-flex items-center gap-2 border-2 border-foreground bg-neon px-3 py-1',
  'font-mono text-[0.65rem] font-bold uppercase tracking-widest text-ink shadow-soft sm:text-xs',
)
