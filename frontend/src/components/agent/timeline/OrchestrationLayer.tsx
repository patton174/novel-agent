import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AgentStepState } from '../../../types/agent'
import {
  deriveOrchestrationHeadline,
  type ThinkRoundPayload,
} from '../../../utils/agentStreamTimeline'
import { hasActiveOrchestrationSteps } from '../../../utils/agentToolStats'
import { ThinkRoundGroup } from './ThinkRoundGroup'
import { translateOrchestrationHeadline } from '../../../utils/orchestrationI18n'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import {
  EDITOR_PIXEL_ORCH_STATUS_LINE,
  EDITOR_PIXEL_ORCH_TIMELINE_GAP,
} from '@/lib/editorPixelClasses'
import {
  CC_TOOL_HEADLINE_BUTTON,
  planningChevronClass,
  TIMELINE_PENDING_IN,
} from '@/lib/timelineClasses'
import { cn } from '@/lib/utils'
import { resolveToolVisualStatus, TimelineLeadIcon } from './TimelineLeadIcon'

/** 外层编排：平铺时间线；点击标题收起/展开内部步骤 */
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
  const toolsStillRunning = hasActiveOrchestrationSteps(stepStates)
  const planningComplete =
    Boolean(orchestrationOverview?.trim()) &&
    !toolsStillRunning &&
    (!streamLive || streamFinished)
  const orchestrationRunning = status === 'active' && !planningComplete
  const showHeaderShimmer = orchestrationRunning && streamLive && !streamFinished
  const userToggledRef = useRef(false)
  const [expanded, setExpanded] = useState(true)

  const mergedItems = useMemo(() => rounds.flatMap((round) => round.items), [rounds])
  const hasBody = mergedItems.length > 0

  useEffect(() => {
    if (pinExpanded) {
      setExpanded(true)
      return
    }
    if (streamFinished && !userToggledRef.current) {
      setExpanded(false)
      return
    }
    if (orchestrationRunning && !userToggledRef.current) {
      setExpanded(true)
    }
  }, [pinExpanded, streamFinished, orchestrationRunning])

  const headline = deriveOrchestrationHeadline(
    rounds,
    stepStates,
    streamLive,
    streamFinished,
    status,
    orchestrationOverview,
  )
  const headlineText = translateOrchestrationHeadline(headline)
  const statusLabel = headlineText
  const showBody = hasBody && (pinExpanded || expanded)

  const handleToggle = () => {
    if (!hasBody || pinExpanded) {
      return
    }
    userToggledRef.current = true
    setExpanded((open) => !open)
  }

  if (!hasBody && !isActive && streamFinished) {
    return null
  }

  return (
    <div
      data-testid="timeline-orchestration-layer"
      className={cn(EDITOR_PIXEL_ORCH_TIMELINE_GAP, TIMELINE_PENDING_IN)}
    >
      <button
        type="button"
        className={cn(CC_TOOL_HEADLINE_BUTTON, EDITOR_PIXEL_ORCH_STATUS_LINE, 'w-full text-left')}
        aria-expanded={hasBody ? showBody : undefined}
        disabled={!hasBody || pinExpanded}
        onClick={handleToggle}
        data-testid="timeline-orchestration-status"
      >
        <TimelineLeadIcon
          iconName="reasoning"
          status={resolveToolVisualStatus({
            loading: orchestrationRunning,
            success: status === 'done' || planningComplete,
          })}
        />
        <span className="min-w-0 flex-1 text-foreground">
          {showHeaderShimmer ? (
            <ShimmerScanText active>{statusLabel}</ShimmerScanText>
          ) : (
            statusLabel
          )}
        </span>
        {hasBody ? (
          <span className={planningChevronClass(showBody)} aria-hidden />
        ) : null}
      </button>

      {showBody ? (
        <ThinkRoundGroup
          items={mergedItems}
          stepStates={stepStates}
          streamLive={streamLive}
          streamFinished={streamFinished}
          messageKey={messageKey}
          thinkExpanded={thinkExpanded}
          onThinkExpandedChange={onThinkExpandedChange}
          orchestrationActive={isActive}
          layoutRemeasureKey="flat"
          flatAlign
          renderTool={renderTool}
          renderText={renderText}
          railContext={{ showThinkRail: false }}
        />
      ) : null}
    </div>
  )
}
