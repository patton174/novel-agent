import { cn } from '@/lib/utils'

export const authFieldClass = cn(
  'w-full h-10 px-3.5 rounded-xl border border-border bg-background',
  'text-sm text-foreground placeholder:text-muted-foreground/70',
  'transition-all duration-200 ease-out',
  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60',
)
