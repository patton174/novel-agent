import { ToolIcon } from '../../../utils/toolIcons'
import { normalizeToolName } from '../../../utils/agentToolNames'
import { toolIconSlotClass, type ToolVisualStatus } from '@/lib/timelineClasses'

export type { ToolVisualStatus } from '@/lib/timelineClasses'

export function resolveToolVisualStatus(opts: {
  loading?: boolean
  error?: boolean
  success?: boolean
}): ToolVisualStatus {
  if (opts.error) {
    return 'error'
  }
  if (opts.loading) {
    return 'loading'
  }
  if (opts.success) {
    return 'success'
  }
  return 'idle'
}

export function TimelineLeadIcon({
  iconName,
  status,
  size = 15,
  nested = false,
}: {
  iconName: string
  status: ToolVisualStatus
  size?: number
  nested?: boolean
}) {
  const key = normalizeToolName(iconName) || iconName
  const px = nested ? Math.max(13, size - 1) : size

  return (
    <span
      className={toolIconSlotClass(status)}
      data-testid="timeline-lead-icon"
      data-status={status}
    >
      <ToolIcon name={key} size={px} animate={status === 'loading'} />
    </span>
  )
}
