import type { ReactNode } from 'react'

interface DashboardHeaderProps {
  title: string
  description?: string
  leading?: ReactNode
  actions?: ReactNode
}

export function DashboardHeader({ title, description, leading, actions }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border/80 bg-surface/95 px-4 shadow-sm backdrop-blur-sm z-10 md:px-8">
      {leading}
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-bold leading-none text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions}
    </header>
  )
}
