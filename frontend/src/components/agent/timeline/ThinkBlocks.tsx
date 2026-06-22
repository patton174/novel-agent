import { useEffect, useMemo, useState } from 'react'
import type { AgentTimelineBlock } from '../../../types/agent'
import { shouldRenderThinkBlock } from '../../../utils/agentStreamTimeline'
import { formatThinkDisplayText, formatThinkStreamingDisplay } from '../../../utils/thinkDisplayText'
import { AgentThinkPanel } from '../AgentThinkPanel'
import { useTimelineBlockStreamText } from './useTimelineBlockStreamText'

export type ThinkTimelineBlock = Extract<AgentTimelineBlock, { kind: 'think' }>
export type ReasoningTimelineBlock = Extract<AgentTimelineBlock, { kind: 'reasoning' }>

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

function useThinkPanelPresentation(
  rawText: string,
  isThinking: boolean,
  isPanelExpanded: boolean,
  maxLines: number,
) {
  const displayText = useMemo(
    () =>
      isThinking
        ? formatThinkStreamingDisplay(rawText, { expanded: isPanelExpanded, maxLines })
        : formatThinkDisplayText(rawText, { expanded: isPanelExpanded, maxLines }),
    [rawText, isThinking, isPanelExpanded, maxLines],
  )

  return { displayText }
}

function InsightThinkRound({
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
  visibleGate,
}: {
  block: ThinkTimelineBlock | ReasoningTimelineBlock
  messageKey: string
  streamLive: boolean
  streamFinished: boolean
  thinkExpanded?: boolean
  onThinkExpandedChange?: (open: boolean) => void
  isolateExpand?: boolean
  inThinkRound?: boolean
  orchestrationActive?: boolean
  onLeadRef?: (el: HTMLElement | null) => void
  visibleGate?: boolean
}) {
  const { displayText: rawText, isThinking } = useTimelineBlockStreamText(
    block,
    messageKey,
    streamLive,
    streamFinished,
    8,
  )
  const { panelExpanded, isPanelExpanded, handleExpandedChange, controlledExpand, pinnedOpen } =
    useInsightExpandState(
      messageKey,
      block.id,
      thinkExpanded,
      isolateExpand,
      onThinkExpandedChange,
    )

  const { displayText } = useThinkPanelPresentation(rawText, isThinking, isPanelExpanded, 0)

  if (visibleGate === false && !rawText.trim() && !isThinking) {
    return null
  }
  if (!isThinking && !rawText.trim()) {
    return null
  }

  return (
    <AgentThinkPanel
      text={rawText}
      displayText={displayText}
      isThinking={isThinking}
      expanded={panelExpanded}
      onExpandedChange={handleExpandedChange}
      markdown
      showCursor={false}
      nested={isolateExpand}
      autoCollapseWhenDone={controlledExpand === undefined && pinnedOpen === null}
      inThinkRound={inThinkRound}
      onLeadRef={onLeadRef}
      leadId={block.id}
      orchestrationActive={orchestrationActive}
      streamScrollWindow={isThinking && !isPanelExpanded}
    />
  )
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
  return (
    <InsightThinkRound
      block={block}
      messageKey={messageKey}
      streamLive={streamLive}
      streamFinished={streamFinished}
      thinkExpanded={thinkExpanded}
      onThinkExpandedChange={onThinkExpandedChange}
      inThinkRound={inThinkRound}
      orchestrationActive={orchestrationActive}
      onLeadRef={onLeadRef}
    />
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

  return (
    <InsightThinkRound
      block={block}
      messageKey={messageKey}
      streamLive={streamLive}
      streamFinished={streamFinished}
      thinkExpanded={thinkExpanded}
      onThinkExpandedChange={onThinkExpandedChange}
      isolateExpand={isolateExpand}
      inThinkRound={inThinkRound}
      orchestrationActive={orchestrationActive}
      onLeadRef={onLeadRef}
      visibleGate={visible}
    />
  )
}
