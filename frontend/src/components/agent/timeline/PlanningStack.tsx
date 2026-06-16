import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AgentStepState, AgentTimelineBlock } from '../../../types/agent'
import { deriveActivePlanningHeadline } from '../../../utils/agentStreamTimeline'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import {
  CC_TOOL_MAIN,
  PLANNING_HEADER,
  PLANNING_HEADER_MAIN,
  PLANNING_HEADLINE_ROW,
  PLANNING_TITLE,
  planningChevronClass,
  planningStackBodyClass,
  planningStackWrapClass,
  thinkLeadCellClass,
} from '@/lib/timelineClasses'
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
    <div
      data-testid="timeline-planning-group"
      className={planningStackWrapClass({
        expanded,
        active: headlineActive,
      })}
    >
      <button
        type="button"
        className={PLANNING_HEADER}
        aria-expanded={expanded}
        onClick={() => {
          userToggledRef.current = true
          setExpanded((open) => !open)
        }}
      >
        <div className={PLANNING_HEADLINE_ROW}>
          <div className={thinkLeadCellClass()}>
            <TimelineLeadIcon
              iconName="reasoning"
              status={resolveToolVisualStatus({
                loading: headlineActive,
                success: !headlineActive && transition.status === 'done',
              })}
            />
          </div>
          <div className={CC_TOOL_MAIN}>
            <div className={PLANNING_HEADER_MAIN}>
              {headlineActive ? (
                <ShimmerScanText active>{headline}</ShimmerScanText>
              ) : (
                <span className={PLANNING_TITLE}>{headline}</span>
              )}
            </div>
          </div>
          <span className={planningChevronClass(expanded)} aria-hidden />
        </div>
      </button>
      {expanded ? (
        <div className={planningStackBodyClass({ branchIndent: true })}>{children}</div>
      ) : null}
    </div>
  )
}
