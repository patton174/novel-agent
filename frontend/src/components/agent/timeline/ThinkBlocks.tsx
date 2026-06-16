import { useEffect, useMemo, useRef, useState } from 'react'
import type { AgentTimelineBlock } from '../../../types/agent'
import { shouldRenderThinkBlock } from '../../../utils/agentStreamTimeline'
import {
  extractOrchestrationSummary,
  formatThinkDisplayText,
  formatThinkStreamingDisplay,
  thinkBodyExcludingSummary,
} from '../../../utils/thinkDisplayText'
import { useTypewriterBuffer } from '../../../hooks/useTypewriterStream'
import { AgentThinkPanel } from '../AgentThinkPanel'
import { AgentMarkdown } from '../AgentMarkdown'
import { useTimelineBlockStreamText } from './useTimelineBlockStreamText'
import {
  ORCHESTRATION_FLAT_ROW,
  ORCHESTRATION_NARRATION,
  ORCHESTRATION_SUMMARY_REVEAL,
  TIMELINE_STREAM_CURSOR,
} from '@/lib/timelineClasses'
import { cn } from '@/lib/utils'

export type ThinkTimelineBlock = Extract<AgentTimelineBlock, { kind: 'think' }>
export type ReasoningTimelineBlock = Extract<AgentTimelineBlock, { kind: 'reasoning' }>

function OrchestrationSummaryReveal({
  text,
  blockId,
  animate,
}: {
  text: string
  blockId: string
  animate: boolean
}) {
  const { visible, isTyping } = useTypewriterBuffer(text, {
    resetKey: `insight-summary:${blockId}`,
    playing: animate,
    finished: !animate,
    maxCharsPerFrame: 4,
  })
  const displayText = animate ? visible : text

  return (
    <div className={ORCHESTRATION_NARRATION}>
      <AgentMarkdown text={displayText} variant="chat" />
      {animate && isTyping ? <span className={TIMELINE_STREAM_CURSOR} aria-hidden /> : null}
    </div>
  )
}

function InsightOrchestrationSummary({
  summary,
  blockId,
  isThinking,
  animate,
}: {
  summary: string
  blockId: string
  isThinking: boolean
  animate: boolean
}) {
  if (isThinking || !summary.trim()) {
    return null
  }
  return (
    <div
      className={cn(ORCHESTRATION_FLAT_ROW, animate && ORCHESTRATION_SUMMARY_REVEAL)}
      data-testid="timeline-orchestration-insight-summary"
    >
      <OrchestrationSummaryReveal text={summary} blockId={blockId} animate={animate} />
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

function useThinkInsightPresentation(
  rawText: string,
  isThinking: boolean,
  isPanelExpanded: boolean,
  maxLines: number,
) {
  const wasThinkingRef = useRef(isThinking)
  const [animateSummary, setAnimateSummary] = useState(false)

  useEffect(() => {
    if (wasThinkingRef.current && !isThinking) {
      setAnimateSummary(true)
    }
    wasThinkingRef.current = isThinking
  }, [isThinking])

  const summary = useMemo(() => extractOrchestrationSummary(rawText), [rawText])
  const panelSourceText = useMemo(
    () => (isThinking ? rawText : thinkBodyExcludingSummary(rawText)),
    [rawText, isThinking],
  )
  const displayText = useMemo(
    () =>
      isThinking
        ? formatThinkStreamingDisplay(rawText, { expanded: isPanelExpanded, maxLines })
        : formatThinkDisplayText(rawText, { expanded: isPanelExpanded, maxLines }),
    [rawText, isThinking, isPanelExpanded, maxLines],
  )

  return { summary, panelSourceText, displayText, animateSummary }
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
  onLeadRef,
}: {
  block: ReasoningTimelineBlock
  messageKey: string
  streamLive: boolean
  streamFinished: boolean
  thinkExpanded?: boolean
  onThinkExpandedChange?: (open: boolean) => void
  inThinkRound?: boolean
  orchestrationActive?: boolean
  onLeadRef?: (el: HTMLElement | null) => void
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

  const { summary, panelSourceText, displayText, animateSummary } = useThinkInsightPresentation(
    rawText,
    isThinking,
    isPanelExpanded,
    3,
  )

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
        onLeadRef={onLeadRef}
        leadId={block.id}
        orchestrationActive={orchestrationActive}
        streamScrollWindow={isThinking && !isPanelExpanded}
      />
      <InsightOrchestrationSummary
        summary={summary}
        blockId={block.id}
        isThinking={isThinking}
        animate={animateSummary}
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
  onLeadRef,
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
  onLeadRef?: (el: HTMLElement | null) => void
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

  const { summary, panelSourceText, displayText, animateSummary } = useThinkInsightPresentation(
    rawText,
    isThinking,
    isPanelExpanded,
    3,
  )

  if (!visible && !rawText.trim() && !isThinking) {
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
        nested={isolateExpand}
        autoCollapseWhenDone={
          !orchestrationActive && controlledExpand === undefined && pinnedOpen === null
        }
        inThinkRound={inThinkRound}
        onLeadRef={onLeadRef}
        leadId={block.id}
        orchestrationActive={orchestrationActive}
        streamScrollWindow={isThinking && !isPanelExpanded}
      />
      <InsightOrchestrationSummary
        summary={summary}
        blockId={block.id}
        isThinking={isThinking}
        animate={animateSummary}
      />
    </>
  )
}
