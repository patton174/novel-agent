import { useCallback, useMemo, useRef, type ReactNode } from 'react'
import type { AgentStepState, AgentTimelineBlock } from '../../../types/agent'
import type { ThinkRoundItem } from '../../../utils/agentStreamTimeline'
import { findStepState } from '../../../utils/agentStreamTimeline'
import { AgentThinkPanel } from '../AgentThinkPanel'
import { ThinkBlock, PlanReasoningBlock } from './ThinkBlocks'
import { OrchestrationStreamBody } from './OrchestrationStreamBody'
import { ThinkRailOverlay } from './ThinkRailOverlay'
import { OrchestrationFlatSlot } from './layout'
import { thinkRoundWrapClass } from '@/lib/timelineClasses'

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
    onLeadRef?: (el: HTMLElement | null) => void
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
        onLeadRef={ctx.onLeadRef}
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
        onLeadRef={ctx.onLeadRef}
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
  layoutRemeasureKey = '',
  renderTool,
  renderText,
  railContext,
}: {
  items: ThinkRoundItem[]
  stepStates: AgentStepState[]
  streamLive: boolean
  streamFinished: boolean
  messageKey: string
  thinkExpanded?: boolean
  onThinkExpandedChange?: (open: boolean) => void
  orchestrationActive?: boolean
  layoutRemeasureKey?: string
  renderTool: (block: Extract<AgentTimelineBlock, { kind: 'tool' }>, key: string) => ReactNode
  renderText?: (block: OrchestrationBodyBlock, key: string) => ReactNode
  railContext?: { showThinkRail: boolean; lastThinkRailId?: string }
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const leadRefs = useRef<Map<string, HTMLElement>>(new Map())

  const toolsRunning = items.some(
    (item) =>
      item.kind === 'tools' &&
      item.blocks.some((block) => {
        const step = findStepState(stepStates, block.stepId)
        return step?.status === 'started'
      }),
  )

  const insightBlocks = items
    .filter((item): item is Extract<ThinkRoundItem, { kind: 'insight' }> => item.kind === 'insight')
    .flatMap((item) => item.blocks)

  const thinkRailBlocks = insightBlocks.filter(
    (b) => b.kind === 'think' || b.kind === 'reasoning',
  )
  const showThinkRail = railContext?.showThinkRail ?? thinkRailBlocks.length >= 2
  const thinkRailIds = useMemo(
    () => thinkRailBlocks.map((block) => block.id),
    [thinkRailBlocks],
  )

  const registerLead = useCallback((blockId: string, el: HTMLElement | null) => {
    const prev = leadRefs.current.get(blockId)
    if (el) {
      if (prev === el) {
        return
      }
      leadRefs.current.set(blockId, el)
      return
    }
    if (prev) {
      leadRefs.current.delete(blockId)
    }
  }, [])

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

  const renderBodyText = (block: OrchestrationBodyBlock, key: string) => (
    <OrchestrationFlatSlot key={key} kind="text">
      {renderText?.(block, key) ?? (
        <OrchestrationStreamBody
          block={block}
          streamLive={streamLive}
          streamFinished={streamFinished}
        />
      )}
    </OrchestrationFlatSlot>
  )

  const renderFlatTool = (
    block: Extract<AgentTimelineBlock, { kind: 'tool' }>,
    key: string,
  ) => (
    <OrchestrationFlatSlot key={key} kind="tool">
      {renderTool(block, key)}
    </OrchestrationFlatSlot>
  )

  return (
    <div
      ref={containerRef}
      data-testid="timeline-think-round"
      className={thinkRoundWrapClass(showThinkRail)}
    >
      {items.map((item, itemIndex) => {
        const itemKey = `${messageKey}:item:${itemIndex}:${item.kind}`
        if (item.kind === 'insight') {
          return item.blocks.map((block) =>
            renderInsightBlock(block, {
              ...ctx,
              onLeadRef: (el) => registerLead(block.id, el),
            }),
          )
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
      {showThinkRail ? (
        <ThinkRailOverlay
          thinkIds={thinkRailIds}
          leadRefs={leadRefs}
          containerRef={containerRef}
          remeasureKey={`${thinkRailIds.join(',')}:${layoutRemeasureKey}`}
        />
      ) : null}
    </div>
  )
}
