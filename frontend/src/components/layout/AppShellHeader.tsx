import type { ReactNode } from 'react'

export interface AppShellHeaderProps {
  title: string
  description?: string
  leading?: ReactNode
  actions?: ReactNode
}

/** Dashboard / Admin 共用顶栏，统一高度与排版 */
export function AppShellHeader({ title, description, leading, actions }: AppShellHeaderProps) {
  return (
    <header className="z-10 flex h-16 shrink-0 items-center gap-3 border-b border-border/80 bg-surface/95 px-4 shadow-sm backdrop-blur-sm md:px-6 lg:px-8">
      {leading}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold leading-none text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground md:line-clamp-1">
            {description}
          </p>
        ) : null}
      </div>
      {actions}
    </header>
  )
}
