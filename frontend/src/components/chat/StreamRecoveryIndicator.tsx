import { useTranslation } from 'react-i18next'
import { ShimmerScanBar } from '../loaders/ShimmerScanBar'
import { ShimmerScanText } from '../loaders/ShimmerScanText'
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
      className={cn('absolute inset-0 z-[3] flex items-center justify-center px-4', className)}
    >
      <div
        className="agent-stream-recovery-backdrop absolute inset-0 bg-background/52 backdrop-blur-[10px] dark:bg-background/68"
        aria-hidden
      />
      <div
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        className="agent-stream-recovery-indicator relative z-[1] flex w-full max-w-[248px] flex-col items-center gap-2.5 rounded-2xl border border-primary/12 bg-background/88 px-5 py-3.5 shadow-[0_10px_40px_rgba(15,23,42,0.07)] backdrop-blur-md dark:bg-background/80 dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
      >
        <ShimmerScanBar width="100%" height={3} />
        <ShimmerScanText active className="text-center text-[11px] font-medium tracking-wide">
          {caption}
        </ShimmerScanText>
      </div>
    </div>
  )
}
