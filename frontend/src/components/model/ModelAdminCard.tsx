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
  /** 连接分组内：更紧凑、隐藏重复密钥/图标 */
  compact?: boolean
  hideApiKey?: boolean
  hideProviderIcon?: boolean
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
  compact = false,
  hideApiKey = false,
  hideProviderIcon = false,
  labels,
  onTest,
  onEdit,
  onSetDefault,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ModelAdminCardProps) {
  const isActive = model.isDefault
  const plansText = model.planCodes?.join(', ') || labels.plansNone
  const metaParts = [
    `${model.provider}/${model.modelName}`,
    model.code,
    !hideApiKey && model.apiKeyMasked ? model.apiKeyMasked : null,
    `${labels.plansLabel}: ${plansText}`,
  ].filter(Boolean)

  return (
    <article className={modelPixelCardClass(isActive, isDragging, compact)}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {(dragHandleProps || onMoveUp || onMoveDown) ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {dragHandleProps ? (
              <button
                type="button"
                className="cursor-grab border-2 border-transparent p-0.5 text-muted-foreground hover:border-foreground/30 active:cursor-grabbing"
                {...dragHandleProps}
              >
                <GripVertical className="size-3.5" />
              </button>
            ) : null}
            {onMoveUp || onMoveDown ? (
              <div className="flex flex-col md:hidden">
                <button
                  type="button"
                  disabled={!canMoveUp || busy}
                  title={labels.moveUp}
                  aria-label={labels.moveUp}
                  onClick={onMoveUp}
                  className="border-2 border-transparent p-0.5 text-muted-foreground hover:border-foreground/30 disabled:opacity-30"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  disabled={!canMoveDown || busy}
                  title={labels.moveDown}
                  aria-label={labels.moveDown}
                  onClick={onMoveDown}
                  className="border-2 border-transparent p-0.5 text-muted-foreground hover:border-foreground/30 disabled:opacity-30"
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {!hideProviderIcon ? (
          <ModelProviderIcon provider={model.provider} label={model.displayName} size="sm" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3
              className={cn(
                'truncate font-black uppercase tracking-tight text-ink',
                compact ? 'text-sm' : 'text-base',
              )}
            >
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
              <span className="font-mono text-[10px] text-muted-foreground">×{model.priceMultiplier}</span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] leading-snug text-muted-foreground" title={metaParts.join(' · ')}>
            {metaParts.join(' · ')}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1 md:pl-2">
        <button type="button" disabled={busy} onClick={onTest} className={modelPixelActionBtnClass('min-w-[3.25rem]')}>
          {testing ? (
            <span className="inline-flex items-center gap-0.5">
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
