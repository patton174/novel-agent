import { ModelProviderIcon } from '@/components/model/ModelProviderIcon'
import type { ModelCredential } from '@/types/model'
import {
  modelPixelActionBtnClass,
  modelPixelByokCardClass,
  modelPixelDestructiveBtnClass,
} from '@/lib/modelPixelClasses'

interface ModelCredentialCardProps {
  credential: ModelCredential
  addModelLabel: string
  editLabel: string
  deleteLabel: string
  modelCountLabel: string
  onAddModel: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ModelCredentialCard({
  credential,
  addModelLabel,
  editLabel,
  deleteLabel,
  modelCountLabel,
  onAddModel,
  onEdit,
  onDelete,
}: ModelCredentialCardProps) {
  const subtitle = `${credential.provider} · ${credential.apiKeyMasked} · ${modelCountLabel.replace('{{count}}', String(credential.modelCount))}`

  return (
    <article className={modelPixelByokCardClass(false)}>
      <ModelProviderIcon provider={credential.provider} label={credential.label} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm font-bold uppercase text-foreground">{credential.label}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground" title={credential.baseUrl}>
          {subtitle}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <button type="button" onClick={onAddModel} className={modelPixelActionBtnClass('h-7 px-2')}>
          {addModelLabel}
        </button>
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
