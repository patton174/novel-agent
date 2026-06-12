import { cn } from '@/lib/utils'

export function agentChoiceButtonClass(active?: boolean) {
  return cn(
    'flex w-full flex-col items-start gap-0.5 rounded-lg border px-2 py-1.5 text-left transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
    active
      ? 'border-primary/30 bg-primary/10 text-foreground'
      : 'border-transparent bg-transparent text-foreground hover:bg-muted/60',
  )
}

export const AGENT_CHOICE_TITLE = 'text-sm font-semibold text-foreground'
export const AGENT_CHOICE_DESC =
  'text-[11px] leading-snug text-muted-foreground max-md:line-clamp-2'
