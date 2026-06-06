interface DashboardHeaderProps {
  title: string
  description?: string
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface px-8 shadow-sm z-10">
      <div>
        <h1 className="text-lg font-bold leading-none text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </header>
  )
}
