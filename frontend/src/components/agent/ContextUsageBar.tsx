import { palette } from '../../styles/theme'
import type { AgentContextUsage } from '../../types/agent'
import {
  CONTEXT_USAGE_BAR_LABEL,
  CONTEXT_USAGE_BAR_META,
  CONTEXT_USAGE_BAR_NOTE,
  CONTEXT_USAGE_BAR_RUN_STATS,
  CONTEXT_USAGE_BAR_STATS,
  CONTEXT_USAGE_BAR_TRACK,
  contextUsageBarWrapClass,
} from '@/lib/agentContextClasses'

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function barColor(percent: number): string {
  if (percent >= 85) return palette.errorBright
  if (percent >= 65) return palette.warning
  return palette.successBright
}

export interface ContextUsageBarProps {
  usage?: AgentContextUsage | null
  compact?: boolean
}

export function ContextUsageBar({ usage, compact = false }: ContextUsageBarProps) {
  if (!usage) return null

  const percent = Math.min(100, Math.max(0, usage.contextPercent))
  const percentLeft =
    usage.percentLeft != null
      ? Math.min(100, Math.max(0, usage.percentLeft))
      : Math.max(0, 100 - percent)
  const color = barColor(percent)
  const sourceLabel =
    usage.source === 'api' ? 'API' : usage.source === 'estimate' ? '估算' : null

  return (
    <div className={contextUsageBarWrapClass(compact)} data-testid="context-usage-bar">
      <div className={CONTEXT_USAGE_BAR_META}>
        <span className={CONTEXT_USAGE_BAR_LABEL}>
          上下文{sourceLabel ? ` · ${sourceLabel}` : ''}
        </span>
        <span className={CONTEXT_USAGE_BAR_STATS}>
          <strong>{formatTokenCount(usage.promptTokens)}</strong>
          <span> / {formatTokenCount(usage.contextLimit)}</span>
          <span>
            {' '}
            ({percent.toFixed(1)}% · 余 {percentLeft.toFixed(0)}%)
          </span>
        </span>
        <span className={CONTEXT_USAGE_BAR_RUN_STATS}>
          In {formatTokenCount(usage.runInputTokens)} · Out {formatTokenCount(usage.runOutputTokens)}
          {usage.cacheReadTokens > 0 ? ` · Cache ${formatTokenCount(usage.cacheReadTokens)}` : null}
        </span>
      </div>
      <div className={CONTEXT_USAGE_BAR_TRACK} aria-hidden>
        <div
          className="h-full rounded-full transition-[width,background] duration-300 ease-out"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      {usage.compactNote ? <div className={CONTEXT_USAGE_BAR_NOTE}>{usage.compactNote}</div> : null}
    </div>
  )
}
