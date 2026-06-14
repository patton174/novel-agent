import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { formatComposerTokens } from '../../utils/contextUsageDisplay'
import { cn } from '@/lib/utils'

export interface RollingTokenDisplayProps {
  value: number
  direction: 'down' | 'up'
  className?: string
}

export function RollingTokenDisplay({ value, direction, className }: RollingTokenDisplayProps) {
  const label = formatComposerTokens(value)
  const [display, setDisplay] = useState(label)
  const [prev, setPrev] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (label === display) return
    setPrev(display)
    setDisplay(label)
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(() => {
      setPrev(null)
      timerRef.current = null
    }, 340)
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [label, display])

  const Icon = direction === 'down' ? ArrowDown : ArrowUp

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums text-muted-foreground',
        className,
      )}
    >
      <span className="relative inline-block h-[1.15em] min-w-[2.75ch] overflow-hidden leading-none">
        {prev ? (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center token-roll-out"
          >
            {prev}
          </span>
        ) : null}
        <span className={cn('flex h-full items-center', prev && 'token-roll-in')}>{display}</span>
      </span>
      <Icon className="size-3 shrink-0 opacity-55" strokeWidth={2.25} aria-hidden />
    </span>
  )
}
