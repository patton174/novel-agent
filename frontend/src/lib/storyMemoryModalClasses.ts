import { cn } from '@/lib/utils'

export const MEMORY_ENTRY_LIST = 'flex flex-col gap-2.5'

export function memoryEntryCardClass(nested?: boolean) {
  return cn(
    'rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5',
    nested && 'ml-1.5',
  )
}

export const MEMORY_ENTRY_KEY = 'mb-1.5 text-[11px] font-bold text-primary'
export const MEMORY_ENTRY_BODY = 'text-[13px] leading-relaxed text-foreground'
export const MEMORY_GROUP_CARD =
  'flex flex-col gap-2 rounded-[14px] border border-border/70 bg-muted/20 px-3 py-2.5'
export const MEMORY_GROUP_HEADER = 'flex flex-col gap-1.5 pb-0.5'
export const MEMORY_GROUP_TITLE = 'text-[15px] font-extrabold text-foreground'
export const MEMORY_GROUP_META = 'flex flex-wrap items-center gap-x-2 gap-y-1.5'
export const MEMORY_ROLE_BADGE =
  'inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary'
export const MEMORY_GROUP_SUMMARY = 'min-w-0 flex-1 text-[11px] text-muted-foreground'
export const MEMORY_PLAIN_VALUE = 'whitespace-pre-wrap break-words'
export const MEMORY_EMPTY_STATE =
  'rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center text-xs text-muted-foreground'
