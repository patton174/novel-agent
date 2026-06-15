import { useEffect, useMemo, useState } from 'react'
import type { AgentTimelineBlock } from '../../../types/agent'
import { shouldRenderThinkBlock } from '../../../utils/agentStreamTimeline'
import {
  extractOrchestrationSummary,
  formatThinkDisplayText,
  thinkBodyExcludingSummary,
} from '../../../utils/thinkDisplayText'
import { AgentThinkPanel } from '../AgentThinkPanel'
import { OrchestrationStreamBody } from './OrchestrationStreamBody'
import { useTimelineBlockStreamText } from './useTimelineBlockStreamText'
import { ORCHESTRATION_FLAT_ROW } from '@/lib/timelineClasses'

export type ThinkTimelineBlock = Extract<AgentTimelineBlock, { kind: 'think' }>
export type ReasoningTimelineBlock = Extract<AgentTimelineBlock, { kind: 'reasoning' }>

function InsightOrchestrationSummary({
  summary,
  blockId,
  streamLive,
  streamFinished,
  isThinking,
}: {
  summary: string
  blockId: string
  streamLive: boolean
  streamFinished: boolean
  isThinking: boolean
}) {
  if (!summary.trim()) {
    return null
  }
  return (
    <div className={ORCHESTRATION_FLAT_ROW} data-testid="timeline-orchestration-insight-summary">
      <OrchestrationStreamBody
        block={{
          kind: 'narration',
          id: `insight-summary:${blockId}`,
          content: summary,
          frozen: !isThinking,
        }}
        streamLive={streamLive}
        streamFinished={streamFinished}
      />
    </div>
  )
}

function useInsightExpandState(
  messageKey: string,
  blockId: string,
  thinkExpanded: boolean | undefined,
  isolateExpand: boolean,
  onThinkExpandedChange?: (open: boolean) => void,
) {
  const [pinnedOpen, setPinnedOpen] = useState<boolean | null>(null)

  useEffect(() => {
    setPinnedOpen(null)
  }, [messageKey, blockId])

  const controlledExpand = !isolateExpand ? thinkExpanded : undefined
  const panelExpanded = pinnedOpen ?? controlledExpand ?? undefined
  const isPanelExpanded = panelExpanded === true

  const handleExpandedChange = (open: boolean) => {
    if (!isolateExpand && typeof onThinkExpandedChange === 'function') {
      onThinkExpandedChange(open)
    }
    setPinnedOpen(open)
  }

  return { panelExpanded, isPanelExpanded, handleExpandedChange, controlledExpand, pinnedOpen }
}

export function PlanReasoningBlock({
  block,
  messageKey,
  streamLive,
  streamFinished,
  thinkExpanded,
  onThinkExpandedChange,
  inThinkRound = false,
  orchestrationActive = false,
}: {
  block: ReasoningTimelineBlock
  messageKey: string
  streamLive: boolean
  streamFinished: boolean
  thinkExpanded?: boolean
  onThinkExpandedChange?: (open: boolean) => void
  inThinkRound?: boolean
  orchestrationActive?: boolean
}) {
  const { displayText: rawText, isThinking } = useTimelineBlockStreamText(
    block,
    messageKey,
    streamLive,
    streamFinished,
    4,
  )
  const { panelExpanded, isPanelExpanded, handleExpandedChange, controlledExpand, pinnedOpen } =
    useInsightExpandState(messageKey, block.id, thinkExpanded, false, onThinkExpandedChange)

  const displayText = useMemo(
    () =>
      formatThinkDisplayText(rawText, {
        isThinking,
        expanded: isPanelExpanded,
        maxLines: 3,
      }),
    [rawText, isThinking, isPanelExpanded],
  )
  const summary = useMemo(() => extractOrchestrationSummary(rawText), [rawText])
  const panelSourceText = useMemo(() => thinkBodyExcludingSummary(rawText), [rawText])

  if (!isThinking && !summary.trim() && !rawText.trim()) {
    return null
  }

  return (
    <>
      <AgentThinkPanel
        text={panelSourceText}
        displayText={displayText}
        isThinking={isThinking}
        expanded={panelExpanded}
        onExpandedChange={handleExpandedChange}
        markdown
        showCursor={false}
        autoCollapseWhenDone={
          !orchestrationActive && controlledExpand === undefined && pinnedOpen === null
        }
        inThinkRound={inThinkRound}
        orchestrationActive={orchestrationActive}
        streamScrollWindow={isThinking && !isPanelExpanded}
      />
      <InsightOrchestrationSummary
        summary={summary}
        blockId={block.id}
        streamLive={streamLive}
        streamFinished={streamFinished}
        isThinking={isThinking}
      />
    </>
  )
}

export function ThinkBlock({
  block,
  messageKey,
  streamLive,
  streamFinished,
  thinkExpanded,
  onThinkExpandedChange,
  isolateExpand = false,
  inThinkRound = false,
  orchestrationActive = false,
}: {
  block: ThinkTimelineBlock
  messageKey: string
  streamLive: boolean
  streamFinished: boolean
  thinkExpanded?: boolean
  onThinkExpandedChange?: (open: boolean) => void
  isolateExpand?: boolean
  inThinkRound?: boolean
  orchestrationActive?: boolean
}) {
  const visible = shouldRenderThinkBlock(block, { streamLive, streamFinished })
  const { displayText: rawText, isThinking } = useTimelineBlockStreamText(
    block,
    messageKey,
    streamLive,
    streamFinished,
    3,
  )

  const { panelExpanded, isPanelExpanded, handleExpandedChange, controlledExpand, pinnedOpen } =
    useInsightExpandState(
      messageKey,
      block.id,
      thinkExpanded,
      isolateExpand,
      onThinkExpandedChange,
    )

  if (!visible && !rawText.trim() && !isThinking) {
    return null
  }

  const displayText = useMemo(
    () =>
      formatThinkDisplayText(rawText, {
        isThinking,
        expanded: isPanelExpanded,
        maxLines: 3,
      }),
    [rawText, isThinking, isPanelExpanded],
  )
  const summary = useMemo(() => extractOrchestrationSummary(rawText), [rawText])
  const panelSourceText = useMemo(() => thinkBodyExcludingSummary(rawText), [rawText])

  return (
    <>
      <AgentThinkPanel
        text={panelSourceText}
        displayText={displayText}
        isThinking={isThinking}
        expanded={panelExpanded}
        onExpandedChange={handleExpandedChange}
        markdown
        showCursor={false}
        nested={isolateExpand}
        autoCollapseWhenDone={
          !orchestrationActive && controlledExpand === undefined && pinnedOpen === null
        }
        inThinkRound={inThinkRound}
        orchestrationActive={orchestrationActive}
        streamScrollWindow={isThinking && !isPanelExpanded}
      />
      <InsightOrchestrationSummary
        summary={summary}
        blockId={block.id}
        streamLive={streamLive}
        streamFinished={streamFinished}
        isThinking={isThinking}
      />
    </>
  )
}
