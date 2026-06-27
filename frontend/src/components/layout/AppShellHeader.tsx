import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface AppShellHeaderProps {
  title?: string
  description?: string
  leading?: ReactNode
  actions?: ReactNode
}

/** Dashboard / Admin 共用顶栏，统一高度与排版 */
export function AppShellHeader({ title, description, leading, actions }: AppShellHeaderProps) {
  const hasTitle = Boolean(title)
  return (
    <header
      className={cn(
        'z-10 flex shrink-0 items-center gap-3 border-b border-border/80 bg-surface/95 px-4 shadow-sm backdrop-blur-sm md:px-6 lg:px-8',
        hasTitle ? 'h-16' : 'h-12',
      )}
    >
      {leading}
      {hasTitle ? (
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-none text-foreground">{title}</h1>
          {description ? (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground md:line-clamp-1">
              {description}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="min-w-0 flex-1" aria-hidden />
      )}
      {actions}
    </header>
  )
}
