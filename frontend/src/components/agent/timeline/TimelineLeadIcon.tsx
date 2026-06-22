import { cn } from '@/lib/utils'
import { ToolIcon } from '../../../utils/toolIcons'
import { normalizeToolName } from '../../../utils/agentToolNames'
import { editorPixelStatusIconClass } from '@/lib/editorPixelClasses'
import type { ToolVisualStatus } from '@/lib/timelineClasses'

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

function pixelIconStatus(status: ToolVisualStatus): 'loading' | 'success' | 'error' | 'idle' {
  if (status === 'loading') {
    return 'loading'
  }
  if (status === 'error') {
    return 'error'
  }
  if (status === 'success') {
    return 'success'
  }
  return 'idle'
}

/** 编排/工具/思考图标：方框包裹；进行中灰底，完成蓝底 */
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
  const px = nested ? Math.max(12, size - 2) : size

  return (
    <span
      className={cn(
        editorPixelStatusIconClass(pixelIconStatus(status)),
        nested && 'size-[1.15rem]',
      )}
      data-testid="timeline-lead-icon"
      data-status={status}
    >
      <ToolIcon name={key} size={px} animate={status === 'loading'} />
    </span>
  )
}
