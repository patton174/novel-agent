function Pulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`.trim()} />
}

function ShellSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-sidebar p-3 md:block">
      <Pulse className="mb-4 h-9 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Pulse key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
    </aside>
  )
}

export function AdminShellSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ShellSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <div className="space-y-2">
            <Pulse className="h-4 w-28" />
            <Pulse className="h-3 w-40" />
          </div>
          <Pulse className="h-8 w-24 rounded-md" />
        </header>
        <main className="flex-1 space-y-4 p-6">
          <AdminContentSkeleton />
        </main>
      </div>
    </div>
  )
}

export function AdminContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Pulse className="h-8 w-48" />
        <Pulse className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Pulse key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Pulse className="h-64 rounded-2xl" />
    </div>
  )
}

export function DashboardShellSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ShellSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border px-6">
          <Pulse className="h-5 w-36" />
        </header>
        <main className="flex-1 space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Pulse key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Pulse className="h-80 rounded-2xl" />
        </main>
      </div>
    </div>
  )
}

export function MarketingPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <Pulse className="mx-auto h-10 w-48" />
        <Pulse className="h-72 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Pulse key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function AuthPageSkeleton() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <Pulse className="hidden lg:block" />
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-4">
          <Pulse className="mx-auto h-8 w-36" />
          <Pulse className="h-11 w-full rounded-md" />
          <Pulse className="h-11 w-full rounded-md" />
          <Pulse className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}

export function BrandLoaderLite({ label = '正在加载' }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <p className="text-xl font-semibold tracking-tight text-foreground">
        Novel <span className="text-primary">AI</span>
      </p>
      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        <span>{label}</span>
      </div>
    </div>
  )
}
