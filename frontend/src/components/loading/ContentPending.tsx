import { InlineBrandLoader } from '@/components/loading/BrandLoader'

/** Lightweight data-fetch pending state — not a full-page skeleton. */
export function ContentPending({ label = '加载中…' }: { label?: string }) {
  return (
    <div
      className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface/40"
      role="status"
      aria-live="polite"
    >
      <InlineBrandLoader label={label} />
    </div>
  )
}
