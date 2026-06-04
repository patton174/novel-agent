import styled, { keyframes } from 'styled-components'
import { palette } from '../../styles/theme'
import { EditorButton } from '../ui/EditorButton'
import type { AgentStepState } from '../../types/agent'
import { stepStatusLabel } from '../../utils/agentLabels'

export interface GlobalAgentTracePanelProps {
  runId?: string
  steps: AgentStepState[]
  activeToolCount: number
  isStreaming: boolean
  expanded: boolean
  onToggle: () => void
}

export function GlobalAgentTracePanel({
  runId,
  steps,
  activeToolCount,
  isStreaming,
  expanded,
  onToggle,
}: GlobalAgentTracePanelProps) {
  if (!isStreaming && steps.length === 0) {
    return null
  }

  const toolSteps = steps.filter((s) => s.type === 'tool')

  return (
    <Panel data-testid="global-agent-trace">
      <EditorButton
        variant="panel"
        fullWidth
        type="button"
        onClick={onToggle}
        data-testid="global-trace-toggle"
      >
        <TitleRow>
          <PulseDot $active={isStreaming} />
          <span>全局链路追踪</span>
          {runId ? <RunId>#{runId.slice(-8)}</RunId> : null}
        </TitleRow>
        <Meta>
          {isStreaming ? (
            <LiveBadge>{activeToolCount > 0 ? `${activeToolCount} 个工具执行中` : 'Agent 运行中'}</LiveBadge>
          ) : (
            <span>{toolSteps.length} 步</span>
          )}
          <Chevron $open={expanded}>›</Chevron>
        </Meta>
      </EditorButton>

      {expanded && (
        <StepList data-testid="global-trace-list">
          {toolSteps.length === 0 && isStreaming ? (
            <EmptyHint>等待工具事件…</EmptyHint>
          ) : null}
          {toolSteps.map((step) => (
            <StepRow key={step.stepId} data-status={step.status}>
              <StatusDot $failed={step.status === 'failed'} $active={step.status === 'started'} />
              <StepMain>
                <StepTitle>{step.title}</StepTitle>
                <StepMeta>{stepStatusLabel(step.status)}</StepMeta>
              </StepMain>
            </StepRow>
          ))}
        </StepList>
      )}
    </Panel>
  )
}

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
`

const Panel = styled.div`
  margin: 0 1.5rem 0.5rem;
  border-radius: 12px;
  background: ${palette.surfaceGlassPanel};
  border: 1px solid ${palette.traceBorder};
  box-shadow: ${palette.traceShadow};
  overflow: hidden;
  flex-shrink: 0;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  color: ${palette.proseMuted};
`

const PulseDot = styled.span<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? palette.accent : palette.traceOk)};
  animation: ${({ $active }) => ($active ? pulse : 'none')} 1.2s ease-in-out infinite;
`

const RunId = styled.code`
  font-size: 0.68rem;
  color: ${palette.textFaint};
  font-weight: 500;
`

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  color: ${palette.textMuted};
`

const LiveBadge = styled.span`
  color: ${palette.accentDeep};
  font-weight: 600;
`

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-block;
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0')});
  transition: transform 0.2s;
`

const StepList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0 0.85rem 0.65rem;
  max-height: 160px;
  overflow-y: auto;
`

const StepRow = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 0.35rem 0;
  border-top: 1px solid ${palette.border};
`

const StatusDot = styled.span<{ $failed?: boolean; $active?: boolean }>`
  width: 7px;
  height: 7px;
  margin-top: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $failed, $active }) =>
    $failed ? palette.errorBright : $active ? palette.accent : palette.traceOk};
`

const StepMain = styled.div`
  flex: 1;
  min-width: 0;
`

const StepTitle = styled.div`
  font-size: 0.76rem;
  font-weight: 600;
  color: ${palette.inkHover};
`

const StepMeta = styled.div`
  font-size: 0.68rem;
  color: ${palette.textMuted};
  margin-top: 2px;
`

const EmptyHint = styled.li`
  font-size: 0.72rem;
  color: ${palette.textFaint};
  padding: 0.35rem 0;
  list-style: none;
`
