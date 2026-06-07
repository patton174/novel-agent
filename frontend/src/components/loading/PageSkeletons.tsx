import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function ShellSidebar({ className }: { className?: string }) {
  return (
    <aside className={cn('hidden w-56 shrink-0 border-r border-border bg-sidebar p-3 md:block', className)}>
      <Skeleton className="mb-4 h-9 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
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
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
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
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

export function DashboardShellSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ShellSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border px-6">
          <Skeleton className="h-5 w-36" />
        </header>
        <main className="flex-1 space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </main>
      </div>
    </div>
  )
}

export function MarketingPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <Skeleton className="mx-auto h-10 w-48" />
        <Skeleton className="h-72 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function AuthPageSkeleton() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <Skeleton className="hidden lg:block" />
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="mx-auto h-8 w-36" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}
