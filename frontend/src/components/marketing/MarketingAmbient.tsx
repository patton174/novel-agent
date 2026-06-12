import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

type AmbientVariant = 'hero' | 'section' | 'subtle'

export function MarketingAmbient({
  variant = 'section',
  className,
}: {
  variant?: AmbientVariant
  className?: string
}) {
  const reduced = useReducedMotion()
  if (reduced) return null

  const intensity = variant === 'hero' ? 1 : variant === 'section' ? 0.65 : 0.4

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div
        className="mkt-orb mkt-orb--slow top-[2%] left-[5%] size-[min(520px,90vw)] bg-indigo-500/25"
        style={{ opacity: intensity }}
      />
      <div
        className="mkt-orb mkt-orb--slower top-[18%] right-[-8%] size-[min(400px,70vw)] bg-violet-400/20"
        style={{ opacity: intensity * 0.9, animationDelay: '-6s' }}
      />
      <div
        className="mkt-orb mkt-orb--slow bottom-[8%] left-[20%] size-[min(360px,60vw)] bg-sky-400/15"
        style={{ opacity: intensity * 0.75, animationDelay: '-12s' }}
      />
      {variant === 'hero' ? (
        <div
          className="mkt-orb mkt-orb--slower top-[42%] left-[55%] size-[280px] bg-fuchsia-400/12"
          style={{ animationDelay: '-4s' }}
        />
      ) : null}
    </div>
  )
}
