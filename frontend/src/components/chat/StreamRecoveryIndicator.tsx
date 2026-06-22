import { useTranslation } from 'react-i18next'
import { ShimmerScanText } from '../loaders/ShimmerScanText'
import { PLANNING_TITLE } from '@/lib/timelineClasses'
import { EDITOR_PIXEL_CARD } from '@/lib/editorPixelClasses'
import { cn } from '@/lib/utils'

export interface StreamRecoveryIndicatorProps {
  /** Screen reader / aria label; display uses short shimmer caption */
  label?: string
  className?: string
}

/** SSE 断线后居中展示的重连 loading（与编排扫光同系） */
export function StreamRecoveryIndicator({ label, className }: StreamRecoveryIndicatorProps) {
  const { t } = useTranslation(['editor'])
  const caption = t('editor:chat.streamRecovery')
  const ariaLabel = label?.trim() || caption

  return (
    <div
      data-testid="stream-recovery-indicator"
      className={cn(
        'pointer-events-auto fixed inset-0 z-[200] flex items-center justify-center px-4',
        className,
      )}
    >
      <div
        className="agent-stream-recovery-backdrop absolute inset-0 bg-background/60"
        aria-hidden
      />
      <div
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        className={cn(
          EDITOR_PIXEL_CARD,
          'agent-stream-recovery-indicator relative z-[1] flex w-full max-w-[280px] flex-col items-center px-6 py-4',
        )}
      >
        <ShimmerScanText
          active
          className={cn(PLANNING_TITLE, 'agent-stream-recovery-caption text-[13px] font-semibold')}
        >
          {caption}
        </ShimmerScanText>
      </div>
    </div>
  )
}
