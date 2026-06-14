import { cn } from '@/lib/utils'

export function contextUsageMeterWrapClass(pending?: boolean) {
  return cn(
    'inline-flex shrink-0 cursor-default select-none items-center gap-[5px] px-0.5',
    pending ? 'opacity-55 hover:opacity-100' : 'opacity-100',
  )
}

export const CONTEXT_USAGE_METER_RING = 'block shrink-0'

export const CONTEXT_USAGE_METER_PERCENT = cn(
  'min-w-[2.1rem] text-[0.72rem] font-medium tabular-nums tracking-tight text-muted-foreground',
)

export function contextUsageBarWrapClass(compact?: boolean) {
  return cn(
    'text-[0.68rem] text-slate-400',
    compact ? 'py-[0.35rem]' : 'pb-2 pt-[0.45rem]',
  )
}

export const CONTEXT_USAGE_BAR_META =
  'mb-[0.3rem] flex flex-wrap items-baseline gap-x-[0.65rem] gap-y-[0.35rem]'

export const CONTEXT_USAGE_BAR_LABEL = 'font-bold text-slate-600'

export const CONTEXT_USAGE_BAR_STATS = cn(
  'text-slate-600 [&_strong]:font-bold [&_strong]:text-slate-700',
)

export const CONTEXT_USAGE_BAR_RUN_STATS =
  'ml-auto text-[0.62rem] text-slate-500'

export const CONTEXT_USAGE_BAR_TRACK =
  'h-1 overflow-hidden rounded-full bg-border'

export const CONTEXT_USAGE_BAR_NOTE = 'mt-[0.28rem] text-[0.62rem] text-indigo-800'
