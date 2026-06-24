import { ChevronDown, ChevronUp, GripVertical, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModelProviderIcon } from '@/components/model/ModelProviderIcon'
import type { AiModel } from '@/types/model'
import {
  modelPixelActionBtnClass,
  modelPixelCardClass,
  modelPixelChipClass,
  modelPixelDestructiveBtnClass,
  modelPixelTestBadgeClass,
} from '@/lib/modelPixelClasses'

export interface ModelTestResult {
  ok: boolean
  latencyMs?: number
  error?: string
}

interface ModelAdminCardProps {
  model: AiModel
  busy?: boolean
  testing?: boolean
  testResult?: ModelTestResult
  canMoveUp?: boolean
  canMoveDown?: boolean
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  labels: {
    defaultBadge: string
    plansLabel: string
    plansNone: string
    test: string
    testing: string
    testOk: string
    testFail: string
    edit: string
    setDefault: string
    deleteBtn: string
    moveUp: string
    moveDown: string
  }
  onTest: () => void
  onEdit: () => void
  onSetDefault: () => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function ModelAdminCard({
  model,
  busy,
  testing,
  testResult,
  canMoveUp,
  canMoveDown,
  isDragging,
  dragHandleProps,
  labels,
  onTest,
  onEdit,
  onSetDefault,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ModelAdminCardProps) {
  const isActive = model.isDefault

  return (
    <article className={modelPixelCardClass(isActive, isDragging)}>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
          {dragHandleProps ? (
            <button
              type="button"
              className="cursor-grab border-2 border-transparent p-0.5 text-muted-foreground hover:border-foreground/30 active:cursor-grabbing"
              {...dragHandleProps}
            >
              <GripVertical className="size-4" />
            </button>
          ) : null}
          {onMoveUp || onMoveDown ? (
            <div className="flex flex-col gap-0.5 md:hidden">
              <button
                type="button"
                disabled={!canMoveUp || busy}
                title={labels.moveUp}
                aria-label={labels.moveUp}
                onClick={onMoveUp}
                className="border-2 border-transparent p-0.5 text-muted-foreground hover:border-foreground/30 disabled:opacity-30"
              >
                <ChevronUp className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={!canMoveDown || busy}
                title={labels.moveDown}
                aria-label={labels.moveDown}
                onClick={onMoveDown}
                className="border-2 border-transparent p-0.5 text-muted-foreground hover:border-foreground/30 disabled:opacity-30"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>
          ) : null}
        </div>
        <ModelProviderIcon provider={model.provider} label={model.displayName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black uppercase tracking-tight text-ink">
              {model.displayName}
            </h3>
            {isActive ? (
              <span className={modelPixelChipClass(true)}>{labels.defaultBadge}</span>
            ) : null}
            {testResult ? (
              <span className={modelPixelTestBadgeClass(testResult.ok)} title={testResult.error}>
                {testResult.ok ? labels.testOk : labels.testFail}
                {testResult.latencyMs != null ? ` · ${testResult.latencyMs}ms` : ''}
              </span>
            ) : null}
            {model.priceMultiplier !== 1 ? (
              <span className="font-mono text-xs text-muted-foreground">×{model.priceMultiplier}</span>
            ) : null}
          </div>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {model.provider}/{model.modelName} · {model.code}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {model.apiKeyMasked}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {labels.plansLabel}: {model.planCodes?.join(', ') || labels.plansNone}
          </p>
        </div>
      </div>

      <div
        className={cn(
          'flex shrink-0 flex-wrap gap-2 transition-opacity duration-200',
          'md:opacity-90 md:group-hover:opacity-100',
        )}
      >
        <button type="button" disabled={busy} onClick={onTest} className={modelPixelActionBtnClass('min-w-[4.5rem]')}>
          {testing ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              {labels.testing}
            </span>
          ) : (
            labels.test
          )}
        </button>
        <button type="button" disabled={busy} onClick={onEdit} className={modelPixelActionBtnClass()}>
          {labels.edit}
        </button>
        {!isActive ? (
          <button
            type="button"
            disabled={busy}
            onClick={onSetDefault}
            className={cn(modelPixelActionBtnClass(), 'bg-neon/30')}
          >
            {labels.setDefault}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy || isActive}
          onClick={onDelete}
          className={modelPixelDestructiveBtnClass('disabled:opacity-40')}
        >
          {labels.deleteBtn}
        </button>
      </div>
    </article>
  )
}
