import { ModelProviderIcon } from '@/components/model/ModelProviderIcon'
import type { UserModel } from '@/types/model'
import {
  modelPixelActionBtnClass,
  modelPixelByokCardClass,
  modelPixelDestructiveBtnClass,
} from '@/lib/modelPixelClasses'

interface ModelByokCardProps {
  model: UserModel
  isSelected?: boolean
  byokBadge: string
  useAsDefaultLabel: string
  editLabel: string
  deleteLabel: string
  onUseAsDefault?: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ModelByokCard({
  model,
  isSelected,
  byokBadge,
  useAsDefaultLabel,
  editLabel,
  deleteLabel,
  onUseAsDefault,
  onEdit,
  onDelete,
}: ModelByokCardProps) {
  const label = model.label || model.modelName || model.id
  const connection = model.credentialLabel ? `${model.credentialLabel} · ` : ''
  const subtitle = `${connection}${model.provider ?? 'custom'} · ${model.modelName ?? ''}`.trim()

  return (
    <article className={modelPixelByokCardClass(isSelected)}>
      <ModelProviderIcon provider={model.provider} label={label} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm font-bold uppercase text-foreground">{label}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {subtitle || byokBadge}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        {onUseAsDefault && !isSelected ? (
          <button type="button" onClick={onUseAsDefault} className={modelPixelActionBtnClass('h-7 px-2')}>
            {useAsDefaultLabel}
          </button>
        ) : null}
        <button type="button" onClick={onEdit} className={modelPixelActionBtnClass('h-7 px-2')}>
          {editLabel}
        </button>
        <button type="button" onClick={onDelete} className={modelPixelDestructiveBtnClass('h-7 px-2')}>
          {deleteLabel}
        </button>
      </div>
    </article>
  )
}
