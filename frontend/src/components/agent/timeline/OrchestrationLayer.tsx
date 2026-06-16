import { useEffect, useRef, useState, useMemo, type ReactNode } from 'react'
import { useAppMobile } from '../../../hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import type { AgentStepState } from '../../../types/agent'
import {
  deriveOrchestrationHeadline,
  type ThinkRoundPayload,
} from '../../../utils/agentStreamTimeline'
import { ThinkRoundGroup } from './ThinkRoundGroup'
import { translateOrchestrationHeadline } from '../../../utils/orchestrationI18n'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import {
  CC_TOOL_MAIN,
  PLANNING_HEADER,
  PLANNING_HEADER_MAIN,
  PLANNING_HEADLINE_ROW,
  PLANNING_TITLE,
  TIMELINE_PENDING_IN,
  planningStackBodyClass,
  planningStackWrapClass,
  thinkLeadCellClass,
} from '@/lib/timelineClasses'
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
  orchestrationOverview,
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
  orchestrationOverview?: string
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
  const planningComplete = Boolean(orchestrationOverview?.trim())
  const showHeaderShimmer = isActive && !planningComplete
  const isMobile = useAppMobile()
  const userToggledRef = useRef(false)
  const [expanded, setExpanded] = useState(() => !isMobile)

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

  useEffect(() => {
    userToggledRef.current = false
    setExpanded(!isMobile)
  }, [messageKey, isMobile])

  const headline = deriveOrchestrationHeadline(
    rounds,
    stepStates,
    streamLive,
    streamFinished,
    status,
    orchestrationOverview,
  )
  const headlineText = translateOrchestrationHeadline(headline)

  const mergedItems = useMemo(() => rounds.flatMap((round) => round.items), [rounds])
  const thinkRailBlocks = useMemo(
    () =>
      mergedItems
        .filter((item): item is Extract<(typeof mergedItems)[number], { kind: 'insight' }> => item.kind === 'insight')
        .flatMap((item) => item.blocks)
        .filter((block) => block.kind === 'think' || block.kind === 'reasoning'),
    [mergedItems],
  )
  const showThinkRail = thinkRailBlocks.length >= 2

  return (
    <div
      data-testid="timeline-orchestration-layer"
      className={planningStackWrapClass({
        expanded,
        active: isActive,
        flat: true,
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
                loading: isActive,
                success: !isActive && status === 'done',
              })}
            />
          </div>
          <div className={CC_TOOL_MAIN}>
            <div className={PLANNING_HEADER_MAIN}>
              {showHeaderShimmer ? (
                <ShimmerScanText active className={PLANNING_TITLE}>
                  {headlineText}
                </ShimmerScanText>
              ) : (
                <span className={PLANNING_TITLE}>{headlineText}</span>
              )}
            </div>
          </div>
        </div>
      </button>
      {expanded ? (
        <div className={cn(planningStackBodyClass({ branchIndent: true }), TIMELINE_PENDING_IN)}>
          {mergedItems.length === 0 ? null : (
            <ThinkRoundGroup
              items={mergedItems}
              stepStates={stepStates}
              streamLive={streamLive}
              streamFinished={streamFinished}
              messageKey={messageKey}
              thinkExpanded={thinkExpanded}
              onThinkExpandedChange={onThinkExpandedChange}
              orchestrationActive={isActive}
              renderTool={renderTool}
              renderText={renderText}
              railContext={{ showThinkRail }}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}
