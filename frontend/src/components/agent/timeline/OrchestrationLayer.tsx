import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AgentStepState } from '../../../types/agent'
import {
  deriveOrchestrationHeadline,
  type ThinkRoundPayload,
} from '../../../utils/agentStreamTimeline'
import { ThinkRoundGroup } from './ThinkRoundGroup'
import {
  CcToolMain,
  PlanningHeadlineRow,
  PlanningHeader,
  PlanningHeaderMain,
  PlanningStackBody,
  PlanningStackWrap,
  PlanningTitle,
  ToolLeadCell,
} from './timelineStyles'
import { resolveToolVisualStatus, TimelineLeadIcon } from './TimelineLeadIcon'

/** 外层编排：思考 + 编排正文 + 工具；问答与其同级，编排结束后整层收起 */
export function OrchestrationLayer({
  rounds,
  status,
  stepStates,
  streamLive,
  streamFinished,
  messageKey,
  thinkExpanded,
  onThinkExpandedChange,
  pinExpanded = false,
  renderTool,
  renderText,
}: {
  rounds: ThinkRoundPayload[]
  status: 'active' | 'done'
  stepStates: AgentStepState[]
  streamLive: boolean
  streamFinished: boolean
  messageKey: string
  thinkExpanded?: boolean
  onThinkExpandedChange?: (open: boolean) => void
  pinExpanded?: boolean
  renderTool: (
    block: Extract<import('../../../types/agent').AgentTimelineBlock, { kind: 'tool' }>,
    key: string,
  ) => ReactNode
  renderText?: (
    block:
      | Extract<import('../../../types/agent').AgentTimelineBlock, { kind: 'text' }>
      | Extract<import('../../../types/agent').AgentTimelineBlock, { kind: 'narration' }>,
    key: string,
  ) => ReactNode
}) {
  const isActive = status === 'active' && streamLive && !streamFinished
  const userToggledRef = useRef(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (pinExpanded) {
      setExpanded(true)
      return
    }
    if (status === 'done' && !userToggledRef.current) {
      setExpanded(false)
      return
    }
    if (isActive && !userToggledRef.current) {
      setExpanded(true)
    }
  }, [status, isActive, pinExpanded])

  const headline = deriveOrchestrationHeadline(
    rounds,
    stepStates,
    streamLive,
    streamFinished,
    status,
  )

  return (
    <PlanningStackWrap
      data-testid="timeline-orchestration-layer"
      $expanded={expanded}
      $active={isActive}
      $flat
    >
      <PlanningHeader
        type="button"
        aria-expanded={expanded}
        onClick={() => {
          userToggledRef.current = true
          setExpanded((open) => !open)
        }}
      >
        <PlanningHeadlineRow>
          <ToolLeadCell>
            <TimelineLeadIcon
              iconName="reasoning"
              status={resolveToolVisualStatus({
                loading: isActive,
                success: !isActive && status === 'done',
              })}
            />
          </ToolLeadCell>
          <CcToolMain>
            <PlanningHeaderMain>
              <PlanningTitle>{headline}</PlanningTitle>
            </PlanningHeaderMain>
          </CcToolMain>
        </PlanningHeadlineRow>
      </PlanningHeader>
      {expanded ? (
        <PlanningStackBody $branchIndent>
          {rounds.length === 0 ? null : (
            rounds.map((round, index) => (
              <ThinkRoundGroup
                key={`${messageKey}:orch-round:${index}`}
                items={round.items}
                stepStates={stepStates}
                streamLive={streamLive}
                streamFinished={streamFinished}
                messageKey={`${messageKey}:${index}`}
                thinkExpanded={thinkExpanded}
                onThinkExpandedChange={onThinkExpandedChange}
                orchestrationActive={isActive}
                renderTool={renderTool}
                renderText={renderText}
              />
            ))
          )}
        </PlanningStackBody>
      ) : null}
    </PlanningStackWrap>
  )
}
