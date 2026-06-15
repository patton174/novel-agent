import { useEffect, useMemo, useState } from 'react'
import type { AgentTimelineBlock } from '../../../types/agent'
import { shouldRenderThinkBlock } from '../../../utils/agentStreamTimeline'
import { formatThinkDisplayText } from '../../../utils/thinkDisplayText'
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

export function PlanReasoningBlock({
  block,
  messageKey,
  streamLive,
  streamFinished,
  thinkExpanded,
  onThinkExpandedChange,
  inThinkRound = false,
  orchestrationActive = false,
  showThinkConnector = false,
}: {
  block: ReasoningTimelineBlock
  messageKey: string
  streamLive: boolean
  streamFinished: boolean
  thinkExpanded?: boolean
  onThinkExpandedChange?: (open: boolean) => void
  inThinkRound?: boolean
  orchestrationActive?: boolean
  showThinkConnector?: boolean
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
      autoCollapseWhenDone={
        !orchestrationActive && controlledExpand === undefined && pinnedOpen === null
      }
      inThinkRound={inThinkRound}
      showThinkConnector={showThinkConnector}
      orchestrationActive={orchestrationActive}
      streamScrollWindow={isThinking && !isPanelExpanded}
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
  showThinkConnector = false,
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
  showThinkConnector?: boolean
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
      autoCollapseWhenDone={
        !orchestrationActive && controlledExpand === undefined && pinnedOpen === null
      }
      inThinkRound={inThinkRound}
      showThinkConnector={showThinkConnector}
      orchestrationActive={orchestrationActive}
      streamScrollWindow={isThinking && !isPanelExpanded}
    />
  )
}
