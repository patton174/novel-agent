import { useMemo } from 'react'
import styled from 'styled-components'
import type { AgentSubagentState } from '../../../types/agent'
import { buildSubagentOrchestration } from '../../../utils/subagentOrchestration'
import { deriveSubagentDisplayMeta } from '../../../utils/subagentDisplayMeta'
import { findStepState } from '../../../utils/agentStreamTimeline'
import { OrchestrationLayer } from './OrchestrationLayer'
import { TimelineDeliveryBlock } from './TimelineDeliveryBlock'
import { TimelineToolBlock } from './TimelineToolBlock'
import { TimelineBodyDivider } from './timelineStyles'
import { editorTheme } from '../../../styles/editorTheme'
import { palette } from '../../../styles/theme'

/** 子 Agent 完整运行时间线：编排层 + 流式正文，与主 Agent 一致 */
export function SubagentTimelineContent({
  subagent,
  loading,
}: {
  subagent: AgentSubagentState
  loading: boolean
}) {
  const { description, status, turn, maxTurns, logs, thinkText, error } = subagent
  const active = status === 'active' && loading
  const streamFinished = status !== 'active'

  const { rounds, stepStates } = useMemo(
    () =>
      buildSubagentOrchestration(logs, {
        runActive: active,
        fallbackThinkText: thinkText,
      }),
    [logs, active, thinkText],
  )

  const toolStatusById = useMemo(() => {
    const map = new Map<string, 'idle' | 'loading' | 'success' | 'error'>()
    for (const log of logs) {
      if (log.phase === 'tool_started' || log.status === 'started') {
        map.set(log.id, 'loading')
      } else if (log.phase === 'tool_done' || log.status === 'completed') {
        map.set(log.id, 'success')
      } else if (log.phase === 'error' || log.status === 'failed') {
        map.set(log.id, 'error')
      }
    }
    return map
  }, [logs])

  const meta = useMemo(
    () => deriveSubagentDisplayMeta(subagent, active),
    [subagent, active],
  )

  const streamingOutput = subagent.summaryPreview?.trim() ?? ''
  const completedOutput = meta.fullOutput ?? meta.summaryBody ?? ''
  const outputText = active ? streamingOutput : completedOutput.trim() || streamingOutput
  const showOutput = Boolean(outputText.trim())

  const turnHint =
    typeof turn === 'number' && turn > 0 && maxTurns
      ? `第 ${turn}/${maxTurns} 轮`
      : null

  return (
    <ContentWrap data-testid="subagent-timeline-content">
      {rounds.length > 0 ? (
        <OrchestrationLayer
          rounds={rounds}
          status={active ? 'active' : 'done'}
          stepStates={stepStates}
          streamLive={loading}
          streamFinished={streamFinished}
          messageKey={`subagent-modal:${description.slice(0, 24)}`}
          pinExpanded={active}
          renderTool={(block, blockKey) => {
            const step = findStepState(stepStates, block.stepId)
            if (!step) {
              return null
            }
            const rowStatus = toolStatusById.get(block.stepId) ?? 'idle'
            return (
              <TimelineToolBlock
                key={blockKey}
                step={step}
                toolLoading={rowStatus === 'loading'}
                showChooseLoading={false}
                showInteraction={false}
                suppressStatus={false}
                nested
              />
            )
          }}
        />
      ) : null}

      {turnHint && active ? <TurnMeta aria-hidden>{turnHint}</TurnMeta> : null}

      {showOutput ? (
        <>
          {rounds.length > 0 ? (
            <TimelineBodyDivider data-testid="subagent-modal-output-divider" />
          ) : null}
          <TimelineDeliveryBlock
            text={outputText}
            streamLive={active}
            testId="subagent-full-output"
          />
        </>
      ) : null}

      {error && status === 'failed' ? <ErrorBox>{error}</ErrorBox> : null}
    </ContentWrap>
  )
}

const ContentWrap = styled.div`
  width: 100%;
  padding: 0.05rem 0.1rem 0.15rem;
`

const TurnMeta = styled.div`
  margin-top: 0.2rem;
  font-size: 0.72rem;
  color: ${editorTheme.textMuted};
`

const ErrorBox = styled.div`
  margin-top: 0.4rem;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  background: ${palette.errorBg};
  color: ${palette.errorUser};
  font-size: 0.78rem;
  line-height: 1.45;
`
