import { Flame } from 'lucide-react'

export function BreathingHotBadge({ label = '热门推荐' }: { label?: string }) {
  return (
    <span className="relative inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-orange-500/30">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-orange-400/50"
        style={{ animationDuration: '2.2s' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-full bg-orange-400/20 blur-md animate-pulse"
        style={{ animationDuration: '2.8s' }}
      />
      <Flame className="relative size-3.5 shrink-0" strokeWidth={2.25} />
      <span className="relative">{label}</span>
    </span>
  )
}
