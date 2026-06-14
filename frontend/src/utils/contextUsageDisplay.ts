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
    `上下文 ${formatCcTokens(usage.promptTokens)} / ${formatCcTokens(usage.contextLimit)}（已用 ${used.toFixed(0)}%，剩余 ${left.toFixed(0)}%）`,
    `本会话 In ${formatCcTokens(usage.runInputTokens)} · Out ${formatCcTokens(usage.runOutputTokens)}${
      usage.cacheReadTokens > 0
        ? ` · Cache ${formatCcTokens(usage.cacheReadTokens)}`
        : usage.cacheCreationTokens > 0
          ? ` · Cache+ ${formatCcTokens(usage.cacheCreationTokens)}`
          : ''
    }`,
  ]
  if (usage.source) {
    lines.push(`计量来源：${usage.source === 'api' ? 'API usage' : usage.source === 'estimate' ? '估算' : usage.source}`)
  }
  if (usage.compactNote) {
    lines.push(usage.compactNote)
  }
  return lines
}
