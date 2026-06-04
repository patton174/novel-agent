import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AgentStepState, AgentTimelineBlock } from '../../../types/agent'
import { deriveActivePlanningHeadline } from '../../../utils/agentStreamTimeline'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import {
  CcToolMain,
  PlanningHeadlineRow,
  PlanningChevron,
  PlanningHeader,
  PlanningHeaderMain,
  PlanningStackBody,
  PlanningStackWrap,
  PlanningTitle,
  ToolLeadCell,
} from './timelineStyles'
import { resolveToolVisualStatus, TimelineLeadIcon } from './TimelineLeadIcon'

/** 编排子步骤：可折叠，一轮 planning.completed 后默认收起 */
export function PlanningStack({
  transition,
  blocks,
  stepStates,
  streamLive,
  streamFinished,
  awaitingInteraction = false,
  children,
}: {
  transition: Extract<AgentTimelineBlock, { kind: 'transition' }>
  blocks: AgentTimelineBlock[]
  stepStates: AgentStepState[]
  streamLive: boolean
  streamFinished: boolean
  awaitingInteraction?: boolean
  children: ReactNode
}) {
  const isActiveRound =
    transition.status === 'active' &&
    streamLive &&
    !streamFinished &&
    !awaitingInteraction
  const userToggledRef = useRef(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (awaitingInteraction && !userToggledRef.current) {
      setExpanded(true)
      return
    }
    if (streamFinished && !userToggledRef.current && !awaitingInteraction) {
      setExpanded(false)
      return
    }
    if (
      (isActiveRound || (streamLive && !streamFinished && blocks.length > 0)) &&
      !userToggledRef.current
    ) {
      setExpanded(true)
    }
  }, [transition.status, isActiveRound, streamFinished, awaitingInteraction, blocks.length, streamLive])

  const headline = deriveActivePlanningHeadline(
    transition,
    blocks,
    stepStates,
    streamLive,
    streamFinished,
  )
  const headlineActive =
    transition.status === 'active' &&
    streamLive &&
    !streamFinished &&
    !awaitingInteraction

  return (
    <PlanningStackWrap
      data-testid="timeline-planning-group"
      $expanded={expanded}
      $active={headlineActive}
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
                loading: headlineActive,
                success: !headlineActive && transition.status === 'done',
              })}
            />
          </ToolLeadCell>
          <CcToolMain>
            <PlanningHeaderMain>
              {headlineActive ? (
                <ShimmerScanText active>{headline}</ShimmerScanText>
              ) : (
                <PlanningTitle>{headline}</PlanningTitle>
              )}
            </PlanningHeaderMain>
          </CcToolMain>
          <PlanningChevron $open={expanded} aria-hidden />
        </PlanningHeadlineRow>
      </PlanningHeader>
      {expanded ? <PlanningStackBody $branchIndent>{children}</PlanningStackBody> : null}
    </PlanningStackWrap>
  )
}
