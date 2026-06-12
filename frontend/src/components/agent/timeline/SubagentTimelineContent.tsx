import { useMemo } from 'react'
import type { AgentSubagentState } from '../../../types/agent'
import { buildSubagentOrchestration } from '../../../utils/subagentOrchestration'
import { deriveSubagentDisplayMeta } from '../../../utils/subagentDisplayMeta'
import { findStepState } from '../../../utils/agentStreamTimeline'
import { OrchestrationLayer } from './OrchestrationLayer'
import { TimelineDeliveryBlock } from './TimelineDeliveryBlock'
import { TimelineToolBlock } from './TimelineToolBlock'
import {
  SUBAGENT_ERROR_BOX,
  SUBAGENT_TIMELINE_WRAP,
  SUBAGENT_TURN_META,
  TIMELINE_BODY_DIVIDER,
} from '@/lib/timelineClasses'

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
    <div data-testid="subagent-timeline-content" className={SUBAGENT_TIMELINE_WRAP}>
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

      {turnHint && active ? (
        <div className={SUBAGENT_TURN_META} aria-hidden>
          {turnHint}
        </div>
      ) : null}

      {showOutput ? (
        <>
          {rounds.length > 0 ? (
            <div
              className={TIMELINE_BODY_DIVIDER}
              data-testid="subagent-modal-output-divider"
            />
          ) : null}
          <TimelineDeliveryBlock
            text={outputText}
            streamLive={active}
            testId="subagent-full-output"
          />
        </>
      ) : null}

      {error && status === 'failed' ? (
        <div className={SUBAGENT_ERROR_BOX}>{error}</div>
      ) : null}
    </div>
  )
}
