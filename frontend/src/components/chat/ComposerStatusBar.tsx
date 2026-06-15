import { useTranslation } from 'react-i18next'
import { ContextUsageMeter } from '../agent/ContextUsageMeter'
import type { AgentContextUsage } from '../../types/agent'
import type { ComposerSpinnerMode } from '../../utils/deriveComposerSpinnerMode'
import { ComposerTokenTicker } from './ComposerTokenTicker'

export interface ComposerStatusBarProps {
  contextUsage?: AgentContextUsage | null
  /** Waiting for first context.usage during an active stream */
  pending?: boolean
  streamActive?: boolean
  spinnerMode?: ComposerSpinnerMode
}

export function ComposerStatusBar({
  contextUsage,
  pending = false,
  streamActive = false,
  spinnerMode = 'idle',
}: ComposerStatusBarProps) {
  const { t } = useTranslation(['editor'])

  return (
    <div
      className="relative flex w-full min-w-0 items-center"
      data-testid="composer-status-bar"
    >
      <div className="shrink-0">
        <ComposerTokenTicker
          usage={contextUsage}
          pending={pending}
          streamActive={streamActive}
          spinnerMode={spinnerMode}
        />
      </div>

      <span className="pointer-events-none absolute left-1/2 max-w-[min(56%,15rem)] -translate-x-1/2 truncate text-center text-[11px] leading-none text-muted-foreground">
        {t('editor:chat.aiWarning')}
      </span>

      <ContextUsageMeter
        usage={contextUsage}
        pending={pending}
        className="ml-auto shrink-0"
      />
    </div>
  )
}
