import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditorButton } from '../ui/EditorButton'
import type {
  AgentAssistantStreamPhase,
  AgentChoiceOption,
  AgentInteractionPayload,
  AgentStepState,
} from '../../types/agent'
import { isHiddenUiTool } from '../../utils/agentHiddenTools'
import { AgentThinkPanel } from './AgentThinkPanel'
import {
  ASSISTANT_TRACE_ACTIVITY_LABEL,
  ASSISTANT_TRACE_ACTIVITY_ROW,
  ASSISTANT_TRACE_CHOICE_DESC,
  ASSISTANT_TRACE_CHOICE_LIST,
  ASSISTANT_TRACE_CHOICE_TITLE,
  ASSISTANT_TRACE_DONE_HINT,
  ASSISTANT_TRACE_FAIL_BADGE,
  ASSISTANT_TRACE_MULTI_ACTIONS,
  ASSISTANT_TRACE_MULTI_HINT,
  ASSISTANT_TRACE_PROGRESS_HINT,
  ASSISTANT_TRACE_SPINNER,
  ASSISTANT_TRACE_STEP_PROMPT,
  ASSISTANT_TRACE_TIMELINE,
  ASSISTANT_TRACE_TOOL_BLOCK,
  agentTraceStatusDotClass,
  assistantTraceStepDetailClass,
} from '@/lib/agentTraceClasses'

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
  const { t } = useTranslation('editor')
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
    <div className={ASSISTANT_TRACE_TIMELINE} data-testid="agent-activity-timeline" aria-label={t('agent.timeline.assistantActivity')}>
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
        <div
          key={step.stepId}
          className={ASSISTANT_TRACE_TOOL_BLOCK}
          data-testid={`agent-trace-step-${step.stepId}`}
        >
          <div className={ASSISTANT_TRACE_ACTIVITY_ROW}>
            {step.status === 'started' ? (
              <span className={ASSISTANT_TRACE_SPINNER} data-testid="agent-trace-step-spinner" />
            ) : (
              <span className={agentTraceStatusDotClass({ failed: step.status === 'failed' })} />
            )}
            <span className={ASSISTANT_TRACE_ACTIVITY_LABEL} data-testid="agent-trace-step-title">
              {step.title}
            </span>
            {step.status === 'failed' && <span className={ASSISTANT_TRACE_FAIL_BADGE}>{t('agent.timeline.phaseFailed')}</span>}
            {step.status === 'started' && step.detail && (
              <span className={ASSISTANT_TRACE_PROGRESS_HINT}>{step.detail}</span>
            )}
            {step.status === 'completed' && !step.choices?.length && (
              <span className={ASSISTANT_TRACE_DONE_HINT}>{t('agent.timeline.statusDone')}</span>
            )}
          </div>

          {step.status === 'failed' && step.outputSummary && (
            <p className={assistantTraceStepDetailClass(true)}>{step.outputSummary}</p>
          )}

          {step.status === 'completed' &&
            step.outputSummary &&
            !step.choices?.length &&
            !step.interaction &&
            step.toolName !== 'output' && (
              <p className={assistantTraceStepDetailClass()}>{step.outputSummary}</p>
            )}

          {step.status === 'completed' && step.choices && step.choices.length > 0 && (
            <div className={ASSISTANT_TRACE_CHOICE_LIST} data-testid="agent-choice-list">
              {step.interaction?.prompt ? (
                <div className={ASSISTANT_TRACE_STEP_PROMPT}>{step.interaction.prompt}</div>
              ) : null}
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
                  <div className={ASSISTANT_TRACE_CHOICE_TITLE}>{choice.title}</div>
                  {choice.description ? (
                    <div className={ASSISTANT_TRACE_CHOICE_DESC}>{choice.description}</div>
                  ) : null}
                </EditorButton>
              ))}
              {step.interaction?.type === 'multi_select' && (
                <div className={ASSISTANT_TRACE_MULTI_ACTIONS}>
                  <span className={ASSISTANT_TRACE_MULTI_HINT}>
                    {t('agent.timeline.multiSelectCount', {
                      count: (multiSelectDrafts[step.stepId] ?? []).length,
                    })}
                  </span>
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
                    {t('agent.timeline.submitChoices')}
                  </EditorButton>
                </div>
              )}
            </div>
          )}
          {step.status === 'completed' &&
            step.interaction &&
            (!step.choices || step.choices.length === 0) && (
              <p className={assistantTraceStepDetailClass()}>
                {step.interaction.prompt ?? t('agent.timeline.continueInput')}
                {step.interaction.free_text_hint ? `（${step.interaction.free_text_hint}）` : ''}
              </p>
            )}
        </div>
      ))}
    </div>
  )
}
