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
      className="grid w-full min-w-0 grid-cols-[minmax(4.5rem,1fr)_minmax(0,auto)_minmax(4.5rem,1fr)] items-center gap-2"
      data-testid="composer-status-bar"
    >
      <div className="justify-self-start">
        <ComposerTokenTicker
          usage={contextUsage}
          pending={pending}
          streamActive={streamActive}
          spinnerMode={spinnerMode}
        />
      </div>

      <span className="max-w-full justify-self-center truncate text-center text-[11px] leading-none text-muted-foreground">
        {t('editor:chat.aiWarning')}
      </span>

      <div className="justify-self-end">
        <ContextUsageMeter usage={contextUsage} pending={pending} />
      </div>
    </div>
  )
}
