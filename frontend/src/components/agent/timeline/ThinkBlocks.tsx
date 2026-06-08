import { useEffect, useState } from 'react'
import type { AgentTimelineBlock } from '../../../types/agent'
import { shouldRenderThinkBlock } from '../../../utils/agentStreamTimeline'
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
  const { displayText, isThinking } = useTimelineBlockStreamText(
    block,
    messageKey,
    streamLive,
    streamFinished,
    4,
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
  const { displayText, isThinking } = useTimelineBlockStreamText(
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

  if (!visible && !displayText.trim() && !isThinking) {
    return null
  }

  const controlledExpand = !isolateExpand ? thinkExpanded : undefined
  const panelExpanded = pinnedOpen ?? controlledExpand ?? undefined
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
    />
  )
}
