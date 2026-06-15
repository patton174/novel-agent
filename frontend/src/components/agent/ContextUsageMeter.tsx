import type { AgentContextUsage } from '../../types/agent'
import {
  contextRemainingPercent,
  contextUsedPercent,
  contextUsageTooltipLines,
  ringStrokeColor,
} from '../../utils/contextUsageDisplay'
import {
  CONTEXT_USAGE_METER_PERCENT,
  CONTEXT_USAGE_METER_RING,
  contextUsageMeterWrapClass,
} from '@/lib/agentContextClasses'

const RING_R = 7
const RING_C = 2 * Math.PI * RING_R

export interface ContextUsageMeterProps {
  usage?: AgentContextUsage | null
  /** Show dim placeholder while waiting for first context.usage */
  pending?: boolean
  className?: string
}

export function ContextUsageMeter({ usage, pending = false, className }: ContextUsageMeterProps) {
  if (!usage && !pending) {
    return null
  }

  const used = usage ? contextUsedPercent(usage) : 0
  const left = usage ? contextRemainingPercent(usage) : 100
  const stroke = ringStrokeColor(used)
  const dashOffset = RING_C * (1 - used / 100)
  const label = usage ? `${Math.round(used)}%` : '…'
  const title = usage ? contextUsageTooltipLines(usage).join('\n') : '等待上下文计量…'

  return (
    <div
      className={contextUsageMeterWrapClass(pending && !usage, className)}
      data-testid="context-usage-meter"
      title={title}
      aria-label={
        usage ? `上下文已用 ${Math.round(used)}%，剩余 ${Math.round(left)}%` : '上下文计量加载中'
      }
    >
      <svg
        className={CONTEXT_USAGE_METER_RING}
        width={18}
        height={18}
        viewBox="0 0 18 18"
        aria-hidden
      >
        <circle cx={9} cy={9} r={RING_R} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={2} />
        <circle
          cx={9}
          cy={9}
          r={RING_R}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 9 9)"
        />
      </svg>
      <span className={CONTEXT_USAGE_METER_PERCENT}>{label}</span>
    </div>
  )
}
