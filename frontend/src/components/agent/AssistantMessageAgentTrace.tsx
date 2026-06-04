import { useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { palette } from '../../styles/theme'
import { EditorButton } from '../ui/EditorButton'
import type { AgentAssistantStreamPhase, AgentChoiceOption, AgentInteractionPayload, AgentStepState } from '../../types/agent'
import { isHiddenUiTool } from '../../utils/agentHiddenTools'
import { AgentThinkPanel } from './AgentThinkPanel'

export interface AssistantMessageAgentTraceProps {
  thinkText?: string
  stepStates?: AgentStepState[]
  activeToolCount?: number
  isStreaming?: boolean
  /** 由 deriveAssistantStreamPhase 驱动顶层「连接 / 规划中」占位行 */
  streamPhase?: AgentAssistantStreamPhase
  isThinking?: boolean
  thinkExpanded?: boolean
  onThinkExpandedChange?: (expanded: boolean) => void
  onSelectChoice?: (choice: AgentChoiceOption) => void
  onSubmitInteraction?: (
    interaction: AgentInteractionPayload,
    payload?: { choice?: AgentChoiceOption; selected?: AgentChoiceOption[] },
  ) => void
}

export function AssistantMessageAgentTrace({
  thinkText,
  stepStates = [],
  isStreaming = false,
  streamPhase,
  isThinking = false,
  thinkExpanded,
  onThinkExpandedChange,
  onSelectChoice,
  onSubmitInteraction,
}: AssistantMessageAgentTraceProps) {
  const [multiSelectDrafts, setMultiSelectDrafts] = useState<Record<string, AgentChoiceOption[]>>({})
  const toolSteps = stepStates.filter(
    (s) => s.type === 'tool' && s.toolName !== 'output' && !isHiddenUiTool(s.toolName),
  )
  const runningTool = toolSteps.find((s) => s.status === 'started')
  const hasThinkContent = Boolean(thinkText?.trim())

  const effectivePhase: AgentAssistantStreamPhase =
    streamPhase ??
    (isStreaming
      ? runningTool
        ? 'tool_running'
        : isThinking
          ? 'planning'
          : 'connecting'
      : 'completed')

  const showThinkingRow =
    isStreaming &&
    !hasThinkContent &&
    (effectivePhase === 'connecting' || effectivePhase === 'planning')

  const thinkPanelActive =
    showThinkingRow || Boolean(isThinking && isStreaming) || hasThinkContent

  const hasAnything = thinkPanelActive || toolSteps.length > 0
  if (!hasAnything) {
    return null
  }

  const toggleMultiSelectChoice = (step: AgentStepState, choice: AgentChoiceOption) => {
    const key = step.stepId
    const current = multiSelectDrafts[key] ?? []
    const exists = current.some((item) => item.id === choice.id)
    const next = exists
      ? current.filter((item) => item.id !== choice.id)
      : [...current, choice]
    setMultiSelectDrafts((prev) => ({ ...prev, [key]: next }))
  }

  const canSubmitMultiSelect = (step: AgentStepState) => {
    const picked = multiSelectDrafts[step.stepId] ?? []
    const min = step.interaction?.min_select ?? 1
    const max = step.interaction?.max_select ?? Number.MAX_SAFE_INTEGER
    return picked.length >= min && picked.length <= max
  }

  return (
    <Timeline data-testid="agent-activity-timeline" aria-label="助手活动">
      {thinkPanelActive ? (
        <AgentThinkPanel
          text={thinkText ?? ''}
          isThinking={showThinkingRow || Boolean(isStreaming && isThinking)}
          expanded={thinkExpanded}
          onExpandedChange={onThinkExpandedChange}
          markdown={false}
          showCursor={false}
          autoCollapseWhenDone={thinkExpanded === undefined && !isStreaming}
        />
      ) : null}

      {toolSteps.map((step) => (
        <ToolBlock key={step.stepId} data-testid={`agent-trace-step-${step.stepId}`}>
          <ActivityRow>
            {step.status === 'started' ? (
              <Spinner data-testid="agent-trace-step-spinner" />
            ) : (
              <StatusDot $failed={step.status === 'failed'} />
            )}
            <ActivityLabel data-testid="agent-trace-step-title">{step.title}</ActivityLabel>
            {step.status === 'failed' && <FailBadge>失败</FailBadge>}
            {step.status === 'started' && step.detail && (
              <ProgressHint>{step.detail}</ProgressHint>
            )}
            {step.status === 'completed' && !step.choices?.length && (
              <DoneHint>完成</DoneHint>
            )}
          </ActivityRow>

          {step.status === 'failed' && step.outputSummary && (
            <StepDetail $error>{step.outputSummary}</StepDetail>
          )}

            {step.status === 'completed' &&
              step.outputSummary &&
              !step.choices?.length &&
              !step.interaction &&
              step.toolName !== 'output' && (
              <StepDetail>{step.outputSummary}</StepDetail>
            )}

          {step.status === 'completed' && step.choices && step.choices.length > 0 && (
            <ChoiceList data-testid="agent-choice-list">
              {step.interaction?.prompt ? <StepPrompt>{step.interaction.prompt}</StepPrompt> : null}
              {step.choices.map((choice) => (
                <EditorButton
                  key={choice.id}
                  variant="choice"
                  fullWidth
                  type="button"
                  disabled={!onSelectChoice && !onSubmitInteraction}
                  active={Boolean(
                    step.interaction?.type === 'multi_select' &&
                      (multiSelectDrafts[step.stepId] ?? []).some((item) => item.id === choice.id),
                  )}
                  onClick={() => {
                    if (step.interaction && onSubmitInteraction) {
                      if (step.interaction.type === 'multi_select') {
                        toggleMultiSelectChoice(step, choice)
                        return
                      }
                      onSubmitInteraction(step.interaction, { choice })
                      return
                    }
                    onSelectChoice?.(choice)
                  }}
                  data-testid={`agent-choice-${choice.id}`}
                >
                  <ChoiceTitle>{choice.title}</ChoiceTitle>
                  {choice.description ? <ChoiceDesc>{choice.description}</ChoiceDesc> : null}
                </EditorButton>
              ))}
              {step.interaction?.type === 'multi_select' && (
                <MultiSelectActions>
                  <MultiSelectHint>
                    已选 {(multiSelectDrafts[step.stepId] ?? []).length} 项
                  </MultiSelectHint>
                  <EditorButton
                    variant="tool"
                    size="sm"
                    type="button"
                    disabled={!canSubmitMultiSelect(step)}
                    onClick={() =>
                      onSubmitInteraction?.(step.interaction!, {
                        selected: multiSelectDrafts[step.stepId] ?? [],
                      })
                    }
                  >
                    提交选择
                  </EditorButton>
                </MultiSelectActions>
              )}
            </ChoiceList>
          )}
          {step.status === 'completed' &&
            step.interaction &&
            (!step.choices || step.choices.length === 0) && (
              <StepDetail>
                {step.interaction.prompt ?? '请继续提供输入'}
                {step.interaction.free_text_hint ? `（${step.interaction.free_text_hint}）` : ''}
              </StepDetail>
            )}
        </ToolBlock>
      ))}
    </Timeline>
  )
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.45rem 1rem 0.35rem;
  border-bottom: 1px solid ${palette.border};
`

const ActivityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 1.25rem;
`

const ActivityLabel = styled.span`
  font-size: 0.78rem;
  font-weight: 500;
  color: ${palette.textSecondary};
`

const ToolBlock = styled.div`
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

const Spinner = styled.span`
  width: 12px;
  height: 12px;
  border: 2px solid ${palette.accentSpinner};
  border-top-color: ${palette.accent};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  flex-shrink: 0;
`

const StatusDot = styled.span<{ $failed?: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $failed }) => ($failed ? palette.errorBright : palette.traceOk)};
  flex-shrink: 0;
`

const FailBadge = styled.span`
  margin-left: auto;
  font-size: 0.68rem;
  color: ${palette.errorBright};
  font-weight: 600;
`

const DoneHint = styled.span`
  margin-left: auto;
  font-size: 0.68rem;
  color: ${palette.traceOk};
`

const ProgressHint = styled.span`
  margin-left: auto;
  font-size: 0.68rem;
  color: ${palette.accentDeep};
  font-weight: 500;
`

const StepDetail = styled.p<{ $error?: boolean }>`
  margin: 0.2rem 0 0 1.35rem;
  font-size: 0.72rem;
  line-height: 1.45;
  color: ${({ $error }) => ($error ? palette.errorDeep : palette.textSubtle)};
  white-space: pre-wrap;
`

const ChoiceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0.35rem 0 0.15rem 0.2rem;
`

const StepPrompt = styled.div`
  font-size: 0.72rem;
  color: ${palette.textDim};
  margin-bottom: 0.2rem;
`

const MultiSelectActions = styled.div`
  margin-top: 0.2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

const MultiSelectHint = styled.span`
  font-size: 0.7rem;
  color: ${palette.textSubtle};
`

const ChoiceTitle = styled.div`
  font-size: 0.78rem;
  font-weight: 600;
  color: ${palette.inkHover};
`

const ChoiceDesc = styled.div`
  margin-top: 0.2rem;
  font-size: 0.71rem;
  line-height: 1.4;
  color: ${palette.textDim};
`
