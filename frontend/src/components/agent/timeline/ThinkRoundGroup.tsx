import type { ReactNode } from 'react'
import type { AgentStepState, AgentTimelineBlock } from '../../../types/agent'
import type { ThinkRoundItem } from '../../../utils/agentStreamTimeline'
import { findStepState } from '../../../utils/agentStreamTimeline'
import { AgentThinkPanel } from '../AgentThinkPanel'
import { ThinkBlock, PlanReasoningBlock } from './ThinkBlocks'
import { OrchestrationStreamBody } from './OrchestrationStreamBody'
import { ORCHESTRATION_FLAT_ROW, thinkRoundWrapClass } from '@/lib/timelineClasses'

type OrchestrationBodyBlock =
  | Extract<AgentTimelineBlock, { kind: 'narration' }>
  | Extract<AgentTimelineBlock, { kind: 'text' }>

function renderInsightBlock(
  block: AgentTimelineBlock,
  ctx: {
    messageKey: string
    streamLive: boolean
    streamFinished: boolean
    thinkExpanded?: boolean
    onThinkExpandedChange?: (open: boolean) => void
    inThinkRound?: boolean
    orchestrationActive?: boolean
  },
): ReactNode {
  if (block.kind === 'reasoning') {
    return (
      <PlanReasoningBlock
        key={block.id}
        block={block}
        messageKey={ctx.messageKey}
        streamLive={ctx.streamLive}
        streamFinished={ctx.streamFinished}
        inThinkRound={ctx.inThinkRound}
        orchestrationActive={ctx.orchestrationActive}
      />
    )
  }
  if (block.kind === 'think') {
    return (
      <ThinkBlock
        key={block.id}
        block={block}
        messageKey={ctx.messageKey}
        streamLive={ctx.streamLive}
        streamFinished={ctx.streamFinished}
        thinkExpanded={ctx.thinkExpanded}
        onThinkExpandedChange={ctx.onThinkExpandedChange}
        isolateExpand
        inThinkRound={ctx.inThinkRound}
        orchestrationActive={ctx.orchestrationActive}
      />
    )
  }
  return null
}

/** 单轮：思考块之间可连竖线；工具/正文平铺缩进，不做树状分支 */
export function ThinkRoundGroup({
  items,
  stepStates,
  streamLive,
  streamFinished,
  messageKey,
  thinkExpanded,
  onThinkExpandedChange,
  orchestrationActive = false,
  suppressRail = false,
  renderTool,
  renderText,
}: {
  items: ThinkRoundItem[]
  stepStates: AgentStepState[]
  streamLive: boolean
  streamFinished: boolean
  messageKey: string
  thinkExpanded?: boolean
  onThinkExpandedChange?: (open: boolean) => void
  orchestrationActive?: boolean
  suppressRail?: boolean
  renderTool: (block: Extract<AgentTimelineBlock, { kind: 'tool' }>, key: string) => ReactNode
  renderText?: (block: OrchestrationBodyBlock, key: string) => ReactNode
}) {
  const toolsRunning = items.some(
    (item) =>
      item.kind === 'tools' &&
      item.blocks.some((block) => {
        const step = findStepState(stepStates, block.stepId)
        return step?.status === 'started'
      }),
  )

  if (items.length === 0) {
    return null
  }

  const ctx = {
    messageKey,
    streamLive,
    streamFinished,
    thinkExpanded,
    onThinkExpandedChange,
    inThinkRound: true,
    orchestrationActive,
  }

  const insightBlocks = items
    .filter((item): item is Extract<ThinkRoundItem, { kind: 'insight' }> => item.kind === 'insight')
    .flatMap((item) => item.blocks)

  const thinkLeadCount = insightBlocks.filter(
    (b) => b.kind === 'think' || b.kind === 'reasoning',
  ).length
  const showThinkRail = !suppressRail && thinkLeadCount >= 2

  const renderBodyText = (block: OrchestrationBodyBlock, key: string) => (
    <div key={key} className={ORCHESTRATION_FLAT_ROW} data-testid="timeline-orchestration-text">
      {renderText?.(block, key) ?? (
        <OrchestrationStreamBody
          block={block}
          streamLive={streamLive}
          streamFinished={streamFinished}
        />
      )}
    </div>
  )

  const renderFlatTool = (
    block: Extract<AgentTimelineBlock, { kind: 'tool' }>,
    key: string,
  ) => (
    <div key={key} className={ORCHESTRATION_FLAT_ROW} data-testid="timeline-orchestration-tool">
      {renderTool(block, key)}
    </div>
  )

  return (
    <div
      data-testid="timeline-think-round"
      className={thinkRoundWrapClass(showThinkRail)}
    >
      {items.map((item, itemIndex) => {
        const itemKey = `${messageKey}:item:${itemIndex}:${item.kind}`
        if (item.kind === 'insight') {
          return item.blocks.map((block) => renderInsightBlock(block, ctx))
        }
        if (item.kind === 'narration' || item.kind === 'text') {
          return item.blocks.map((block, textIndex) =>
            renderBodyText(block, `${itemKey}:text:${textIndex}:${block.id}`),
          )
        }
        if (item.kind === 'tools') {
          return item.blocks.map((block, toolIndex) =>
            renderFlatTool(block, `${itemKey}:tool:${toolIndex}:${block.id}`),
          )
        }
        return null
      })}

      {insightBlocks.length === 0 && items.every((item) => item.kind === 'tools') ? (
        <AgentThinkPanel
          isThinking={toolsRunning && streamLive && !streamFinished}
          text=""
          autoCollapseWhenDone
          orchestrationActive={orchestrationActive}
        />
      ) : null}
    </div>
  )
}
