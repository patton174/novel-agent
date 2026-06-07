import { BrandLoader } from '@/components/loading/BrandLoader'
import { Skeleton } from '@/components/ui/skeleton'

function ShellSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-sidebar p-3 md:block">
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

export function AdminTableContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <Skeleton className="h-10 rounded-none" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="mt-px h-12 rounded-none" />
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
    </div>
  )
}

export function AdminStatsContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )
}

export function AdminCrawlerContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-[min(42vh,360px)] rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function AdminCatalogContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-72 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
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
          <DashboardHomeContentSkeleton />
        </main>
      </div>
    </div>
  )
}

export function DashboardHomeContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function NovelsGridContentSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border p-5">
            <Skeleton className="mb-4 h-32 rounded-xl" />
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="mb-6 h-4 w-1/2" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function BookstoreContentSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export function BillingContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

export function SettingsContentSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-11 rounded-lg" />
      <Skeleton className="h-11 rounded-lg" />
      <Skeleton className="h-11 rounded-lg" />
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

/** route-shells chunk 内使用的品牌 Loading（与主包 BrandLoader 视觉一致） */
export function BrandLoaderLite({ label = '正在加载' }: { label?: string }) {
  return <BrandLoader label={label} />
}

export { BrandLoader, InlineBrandLoader } from '@/components/loading/BrandLoader'
