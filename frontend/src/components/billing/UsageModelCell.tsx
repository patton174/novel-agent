import { ModelProviderIcon } from '@/components/model/ModelProviderIcon'
import { usageEventModelDisplay } from '@/utils/modelSelection'

export function UsageModelCell({
  ev,
}: {
  ev: { model?: string | null; metadata?: Record<string, unknown> | null }
}) {
  const { displayName, provider } = usageEventModelDisplay(ev)
  return (
    <span className="inline-flex min-w-0 max-w-[12rem] items-center gap-1.5">
      <ModelProviderIcon provider={provider} label={displayName} size="sm" />
      <span className="truncate text-muted-foreground" title={displayName}>
        {displayName}
      </span>
    </span>
  )
}
