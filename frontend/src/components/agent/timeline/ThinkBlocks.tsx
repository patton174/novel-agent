import { useEffect, useMemo, useState } from 'react'
import type { AgentTimelineBlock } from '../../../types/agent'
import { shouldRenderThinkBlock } from '../../../utils/agentStreamTimeline'
import { formatThinkDisplayText } from '../../../utils/thinkDisplayText'
import { AgentThinkPanel } from '../AgentThinkPanel'
import { useTimelineBlockStreamText } from './useTimelineBlockStreamText'

export type ThinkTimelineBlock = Extract<AgentTimelineBlock, { kind: 'think' }>
export type ReasoningTimelineBlock = Extract<AgentTimelineBlock, { kind: 'reasoning' }>

export function PlanReasoningBlock({
  block,
  messageKey,
  streamLive,
  streamFinished,
  inThinkRound = false,
}: {
  block: ReasoningTimelineBlock
  messageKey: string
  streamLive: boolean
  streamFinished: boolean
  inThinkRound?: boolean
  /** @deprecated 推理完成后始终自动折叠，不再随编排层保持展开 */
  orchestrationActive?: boolean
}) {
  const { displayText: rawText, isThinking } = useTimelineBlockStreamText(
    block,
    messageKey,
    streamLive,
    streamFinished,
    4,
  )
  const displayText = useMemo(
    () =>
      formatThinkDisplayText(rawText, {
        isThinking,
        expanded: false,
        maxLines: 3,
      }),
    [rawText, isThinking],
  )

  if (!isThinking && !displayText.trim()) {
    return null
  }

  return (
    <AgentThinkPanel
      text={displayText}
      isThinking={isThinking}
      markdown
      showCursor={false}
      autoCollapseWhenDone
      inThinkRound={inThinkRound}
      orchestrationActive={false}
      streamScrollWindow={isThinking}
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
}: {
  block: ThinkTimelineBlock
  messageKey: string
  streamLive: boolean
  streamFinished: boolean
  thinkExpanded?: boolean
  onThinkExpandedChange?: (open: boolean) => void
  /** 编排内思考：不与主思考共用展开状态 */
  isolateExpand?: boolean
  /** @deprecated 编排轮次标题已外置，思考块始终自动收起 */
  holdOpenWhileRoundActive?: boolean
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

  const [pinnedOpen, setPinnedOpen] = useState<boolean | null>(null)

  useEffect(() => {
    setPinnedOpen(null)
  }, [messageKey, block.id])

  if (!visible && !rawText.trim() && !isThinking) {
    return null
  }

  const controlledExpand = !isolateExpand ? thinkExpanded : undefined
  const panelExpanded = pinnedOpen ?? controlledExpand ?? undefined
  const isPanelExpanded = panelExpanded === true
  const displayText = useMemo(
    () =>
      formatThinkDisplayText(rawText, {
        isThinking,
        expanded: isPanelExpanded,
        maxLines: 3,
      }),
    [rawText, isThinking, isPanelExpanded],
  )
  const handleExpandedChange = (open: boolean) => {
    if (!isolateExpand && typeof onThinkExpandedChange === 'function') {
      onThinkExpandedChange(open)
    }
    setPinnedOpen(open)
  }

  return (
    <AgentThinkPanel
      text={displayText}
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
  )
}
