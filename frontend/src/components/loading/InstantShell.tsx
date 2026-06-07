/** 极轻量占位（留在主包 / layout 包），route-shells chunk 加载前的第一帧 */
export type InstantShellVariant = 'page' | 'content' | 'admin'

export function InstantShell({ variant = 'page' }: { variant?: InstantShellVariant }) {
  if (variant === 'content') {
    return (
      <div className="space-y-4" aria-hidden>
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded-md bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (variant === 'admin') {
    return (
      <div className="flex h-full min-h-[50vh] bg-background" aria-hidden>
        <div className="hidden w-56 shrink-0 bg-muted/30 md:block" />
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" aria-hidden>
      <div className="h-14 animate-pulse bg-muted/40" />
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <div className="mx-auto h-10 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  )
}
