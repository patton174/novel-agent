import { useMemo } from 'react'
import type { AgentSubagentState } from '../../../types/agent'
import { AssistantStreamTimeline } from '../AssistantStreamTimeline'
import { SUBAGENT_ERROR_BOX, SUBAGENT_TIMELINE_WRAP, SUBAGENT_TURN_META } from '@/lib/timelineClasses'

/** 子 Agent 完整运行时间线：与主 Agent 共用 AssistantStreamTimeline + messageSegment */
export function SubagentTimelineContent({
  subagent,
  loading,
}: {
  subagent: AgentSubagentState
  loading: boolean
}) {
  const { description, status, turn, maxTurns, thinkText, error, childRunId } = subagent
  const active = status === 'active' && loading
  const streamFinished = status !== 'active'

  const messageKey = useMemo(
    () => `subagent:${childRunId ?? description.slice(0, 24)}`,
    [childRunId, description],
  )

  const turnHint =
    typeof turn === 'number' && turn > 0 && maxTurns
      ? `第 ${turn}/${maxTurns} 轮`
      : null

  return (
    <div data-testid="subagent-timeline-content" className={SUBAGENT_TIMELINE_WRAP}>
      <AssistantStreamTimeline
        timeline={subagent.timeline ?? []}
        stepStates={subagent.childStepStates ?? []}
        streamLive={active && loading}
        streamFinished={streamFinished}
        messageKey={messageKey}
        fallbackThinkText={thinkText}
        pinOrchestrationOpen={active}
        streamingMessageContent={subagent.messageContent}
        segmentOpen={subagent.segmentOpen}
      />

      {turnHint && active ? (
        <div className={SUBAGENT_TURN_META} aria-hidden>
          {turnHint}
        </div>
      ) : null}

      {error && status === 'failed' ? (
        <div className={SUBAGENT_ERROR_BOX}>{error}</div>
      ) : null}
    </div>
  )
}
