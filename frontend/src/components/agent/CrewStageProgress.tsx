import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { CrewStageUiState, CrewStageUiStep } from '@/types/crew'

export interface CrewStageProgressProps {
  state: CrewStageUiState | null | undefined
  className?: string
}

function crewStageI18nKey(status: CrewStageUiStep['status']): string {
  switch (status) {
    case 'active':
      return 'running'
    case 'done':
      return 'completed'
    default:
      return status
  }
}

export function CrewStageProgress({ state, className }: CrewStageProgressProps) {
  const { t } = useTranslation(['editor'])
  if (!state?.steps?.length) {
    return null
  }

  return (
    <div
      className={cn('flex w-full min-w-0 flex-col gap-1.5', className)}
      data-testid="crew-stage-progress"
    >
      {state.displayName ? (
        <div className="truncate text-xs font-medium text-foreground">{state.displayName}</div>
      ) : null}
      <ol className="m-0 flex list-none items-center gap-1 p-0">
        {state.steps.map((step, index) => {
          const isLast = index === state.steps.length - 1
          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-center gap-1">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold',
                    step.status === 'active' && 'border-primary bg-primary/10 text-primary',
                    step.status === 'done' && 'border-emerald-500 bg-emerald-500/10 text-emerald-700',
                    step.status === 'failed' && 'border-destructive bg-destructive/10 text-destructive',
                    step.status === 'pending' && 'border-border text-muted-foreground',
                  )}
                  title={step.summary}
                >
                  {index + 1}
                </span>
                <span className="max-w-full truncate text-[0.62rem] text-muted-foreground">
                  {t(`editor:crew.stage.${crewStageI18nKey(step.status)}`, {
                    defaultValue: step.label,
                  })}
                </span>
              </div>
              {!isLast ? (
                <span
                  className={cn(
                    'mb-3 h-px min-w-[0.35rem] flex-1',
                    step.status === 'done' ? 'bg-emerald-400' : 'bg-border',
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
