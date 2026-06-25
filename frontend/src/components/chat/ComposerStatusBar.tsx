import { useTranslation } from 'react-i18next'
import { ContextUsageMeter } from '../agent/ContextUsageMeter'
import { ModelProviderIcon } from '@/components/model/ModelProviderIcon'
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

  const billedModel = contextUsage?.resolvedModel

  return (
    <div
      className="relative flex w-full min-w-0 items-center gap-2"
      data-testid="composer-status-bar"
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <ComposerTokenTicker
          usage={contextUsage}
          pending={pending}
          streamActive={streamActive}
          spinnerMode={spinnerMode}
        />
      </div>

      {billedModel?.displayName ? (
        <span
          className="inline-flex min-w-0 max-w-[min(40%,10rem)] shrink items-center gap-1"
          title={t('editor:chat.billedModelLabel', { name: billedModel.displayName })}
        >
          <ModelProviderIcon
            provider={billedModel.provider}
            label={billedModel.displayName}
            size="sm"
          />
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            {billedModel.displayName}
          </span>
        </span>
      ) : null}

      <span className="pointer-events-none absolute left-1/2 max-w-[min(40%,12rem)] -translate-x-1/2 truncate text-center text-[11px] leading-none text-muted-foreground">
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
