import { useTranslation } from 'react-i18next'
import { ShimmerScanText } from '../loaders/ShimmerScanText'
import { PLANNING_TITLE } from '@/lib/timelineClasses'
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
        className="agent-stream-recovery-backdrop absolute inset-0 bg-background/52 backdrop-blur-[10px] dark:bg-background/68"
        aria-hidden
      />
      <div
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        className="agent-stream-recovery-indicator relative z-[1] flex w-full max-w-[280px] flex-col items-center rounded-2xl border border-primary/15 bg-background/90 px-6 py-4 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-primary/20 dark:bg-background/85 dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
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
