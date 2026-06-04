import { ToolIcon } from '../../../utils/toolIcons'
import { normalizeToolName } from '../../../utils/agentToolNames'
import { ToolIconSlot, type ToolVisualStatus } from './timelineStyles'

export type { ToolVisualStatus } from './timelineStyles'

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
  const animate = status === 'loading'

  return (
    <ToolIconSlot $status={status} data-testid="timeline-lead-icon" data-status={status}>
      <ToolIcon name={key} size={px} animate={animate} />
    </ToolIconSlot>
  )
}
