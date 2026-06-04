import styled from 'styled-components'
import { palette } from '../../styles/theme'
import type { AgentContextUsage } from '../../types/agent'

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
    <Wrap $compact={compact} data-testid="context-usage-bar">
      <MetaRow>
        <Label>上下文{sourceLabel ? ` · ${sourceLabel}` : ''}</Label>
        <Stats>
          <strong>{formatTokenCount(usage.promptTokens)}</strong>
          <span> / {formatTokenCount(usage.contextLimit)}</span>
          <span>
            {' '}
            ({percent.toFixed(1)}% · 余 {percentLeft.toFixed(0)}%)
          </span>
        </Stats>
        <RunStats>
          In {formatTokenCount(usage.runInputTokens)} · Out {formatTokenCount(usage.runOutputTokens)}
          {usage.cacheReadTokens > 0 ? ` · Cache ${formatTokenCount(usage.cacheReadTokens)}` : null}
        </RunStats>
      </MetaRow>
      <Track aria-hidden>
        <Fill $width={percent} $color={color} />
      </Track>
      {usage.compactNote ? <Note>{usage.compactNote}</Note> : null}
    </Wrap>
  )
}

const Wrap = styled.div<{ $compact?: boolean }>`
  padding: ${({ $compact }) => ($compact ? '0.35rem 0' : '0.45rem 0 0.5rem')};
  font-size: 0.68rem;
  color: ${palette.textDim};
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.65rem;
  margin-bottom: 0.3rem;
`

const Label = styled.span`
  font-weight: 700;
  color: ${palette.textSecondary};
`

const Stats = styled.span`
  color: ${palette.proseMuted};

  strong {
    color: ${palette.inkSoft};
    font-weight: 700;
  }
`

const RunStats = styled.span`
  margin-left: auto;
  color: ${palette.textMuted};
  font-size: 0.62rem;
`

const Track = styled.div`
  height: 4px;
  border-radius: 999px;
  background: ${palette.border};
  overflow: hidden;
`

const Fill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  border-radius: 999px;
  transition: width 0.35s ease, background 0.25s ease;
`

const Note = styled.div`
  margin-top: 0.28rem;
  color: ${palette.accentDark};
  font-size: 0.62rem;
`
