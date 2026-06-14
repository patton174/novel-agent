import { useMemo } from 'react'
import type { AgentContextUsage } from '../../types/agent'
import type { ComposerSpinnerMode } from '../../utils/deriveComposerSpinnerMode'
import { deriveComposerTokenDisplay } from '../../utils/deriveComposerTokenDisplay'
import { RollingTokenDisplay } from './RollingTokenDisplay'
import { cn } from '@/lib/utils'

export interface ComposerTokenTickerProps {
  usage?: AgentContextUsage | null
  pending?: boolean
  streamActive?: boolean
  spinnerMode?: ComposerSpinnerMode
}

export function ComposerTokenTicker({
  usage,
  pending = false,
  streamActive = false,
  spinnerMode = 'idle',
}: ComposerTokenTickerProps) {
  const display = useMemo(() => {
    if (!usage) return null
    return deriveComposerTokenDisplay({
      usage,
      streamActive,
      spinnerMode,
    })
  }, [usage, streamActive, spinnerMode])

  if (!usage && pending) {
    return (
      <span className="inline-flex min-w-[4.5rem] items-center text-[11px] tabular-nums text-muted-foreground/70">
        …
      </span>
    )
  }

  if (!usage || !display) {
    return (
      <span className="inline-flex min-w-[4.5rem] items-center text-[11px] tabular-nums text-muted-foreground/70">
        —
      </span>
    )
  }

  return (
    <div className="relative inline-flex min-w-[4.5rem] shrink-0 items-center">
      <div key={`${display.mode}-${display.direction}`} className={cn('token-slot-in')}>
        <RollingTokenDisplay value={display.value} direction={display.direction} />
      </div>
    </div>
  )
}
