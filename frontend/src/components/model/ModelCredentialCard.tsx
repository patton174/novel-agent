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
  const modelCount = modelCountLabel.replace('{{count}}', String(credential.modelCount))
  const subtitle = `${credential.provider} · ${credential.apiKeyMasked} · ${modelCount}`

  return (
    <article className={modelPixelByokCardClass(false)}>
      <ModelProviderIcon provider={credential.provider} label={credential.label} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs font-bold uppercase leading-tight text-foreground">
          {credential.label}
          <span className="ml-2 font-normal normal-case text-muted-foreground">{subtitle}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <button type="button" onClick={onAddModel} className={modelPixelActionBtnClass()}>
          {addModelLabel}
        </button>
        <button type="button" onClick={onEdit} className={modelPixelActionBtnClass()}>
          {editLabel}
        </button>
        <button type="button" onClick={onDelete} className={modelPixelDestructiveBtnClass()}>
          {deleteLabel}
        </button>
      </div>
    </article>
  )
}
