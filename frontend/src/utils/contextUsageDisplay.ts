import i18n from '@/i18n'
import type { AgentContextUsage } from '../types/agent'

/** CC `formatTokens` — compact k/M suffix, drop trailing .0 */
export function formatCcTokens(count: number): string {
  const n = Math.max(0, Math.round(count))
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(1).replace(/\.0$/, '')
    return `${v}m`
  }
  if (n >= 10_000) {
    const v = (n / 1000).toFixed(1).replace(/\.0$/, '')
    return `${v}k`
  }
  if (n >= 1000) {
    const v = (n / 1000).toFixed(1).replace(/\.0$/, '')
    return `${v}k`
  }
  return String(n)
}

/** Composer footer: uppercase K/M suffix (12K, 1.2M) */
export function formatComposerTokens(count: number): string {
  return formatCcTokens(count).replace(/k$/, 'K').replace(/m$/, 'M')
}

/** CC `calculateContextPercentages` — used % from prompt vs window. */
export function contextUsedPercent(usage: AgentContextUsage): number {
  const limit = usage.contextLimit > 0 ? usage.contextLimit : 200_000
  const used =
    usage.contextPercent > 0
      ? usage.contextPercent
      : Math.round((usage.promptTokens / limit) * 100)
  return Math.min(100, Math.max(0, used))
}

export function contextRemainingPercent(usage: AgentContextUsage): number {
  if (usage.percentLeft != null) {
    return Math.min(100, Math.max(0, usage.percentLeft))
  }
  return Math.max(0, 100 - contextUsedPercent(usage))
}

export function ringStrokeColor(usedPercent: number): string {
  if (usedPercent >= 85) return '#c45c5c'
  if (usedPercent >= 65) return '#b8860b'
  return '#6b6b6b'
}

export function contextUsageTooltipLines(usage: AgentContextUsage): string[] {
  const used = contextUsedPercent(usage)
  const left = contextRemainingPercent(usage)
  const lines = [
    i18n.t('editor:agent.context.tooltipSummary', {
      prompt: formatCcTokens(usage.promptTokens),
      limit: formatCcTokens(usage.contextLimit),
      used: used.toFixed(0),
      left: left.toFixed(0),
    }),
    i18n.t('editor:agent.context.tooltipRun', {
      input: formatCcTokens(usage.runInputTokens),
      output: formatCcTokens(usage.runOutputTokens),
      cache:
        usage.cacheReadTokens > 0
          ? ` · Cache ${formatCcTokens(usage.cacheReadTokens)}`
          : usage.cacheCreationTokens > 0
            ? ` · Cache+ ${formatCcTokens(usage.cacheCreationTokens)}`
            : '',
    }),
  ]
  if (usage.source) {
    const sourceLabel =
      usage.source === 'api'
        ? i18n.t('editor:agent.context.sourceApi')
        : usage.source === 'estimate'
          ? i18n.t('editor:agent.context.sourceEstimate')
          : usage.source
    lines.push(i18n.t('editor:agent.context.tooltipSource', { source: sourceLabel }))
  }
  if (usage.compactNote) {
    lines.push(usage.compactNote)
  }
  return lines
}
