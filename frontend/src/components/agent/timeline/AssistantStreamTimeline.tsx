import { Fragment, useMemo, useState, type ReactNode } from 'react'
import type {
  AgentChoiceOption,
  AgentStepState,
  AgentTimelineBlock,
} from '../../../types/agent'
import { useTypewriterBuffer } from '../../../hooks/useTypewriterStream'
import {
  findChoiceSelectedForStep,
  findStepState,
  groupTimelineUnits,
  isSiblingExposureBlock,
  normalizeTimelineBlockIds,
  orchestrationOverviewFromTimeline,
  shouldRenderThinkBlock,
  shouldShowOrchestrationResumeGap,
} from '../../../utils/agentStreamTimeline'
import { OrchestrationLayer } from './OrchestrationLayer'
import { OrchestrationPendingRow } from './OrchestrationPendingRow'
import { PlanningStack } from './PlanningStack'
import { findStepForTimelineTool } from '../../../utils/agentMessageReplay'
import {
  collapseConsecutiveMemoryReads,
  pruneRedundantChoiceSelected,
} from '../../../utils/agentTimelineToolCollapse'
import { isHiddenUiTool } from '../../../utils/agentHiddenTools'
import { isAskUserTool } from '../../../utils/agentToolNames'
import { isToolErrorLikeText } from '../../../utils/toolErrorText'
import { AskUserForm } from '../AskUserForm'
import { EditorButton } from '../../ui/EditorButton'
import { SelectedChoiceSummary } from './SelectedChoiceSummary'
import { StaggeredChoices } from './StaggeredChoices'
import { TimelineDeliveryBlock } from './TimelineDeliveryBlock'
import { TimelineToolBlock } from './TimelineToolBlock'
import { PlanReasoningBlock, ThinkBlock } from './ThinkBlocks'
import { ThinkRoundGroup } from './ThinkRoundGroup'
import type { AssistantStreamTimelineProps } from './types'
import {
  CHOICE_LIST,
  CUSTOM_HINT,
  CUSTOM_INPUT,
  CUSTOM_INPUT_ROW,
  MULTI_SELECT_ACTIONS,
  MULTI_SELECT_HINT,
  STEP_PROMPT,
  TIMELINE_COLUMN,
  TIMELINE_SLOT,
  TIMELINE_THINK_WRAP,
} from '@/lib/timelineClasses'
import { runeLength, visiblePrefixForBlock } from './timelineUtils'
import { useAppMobile } from '@/hooks/useMediaQuery'

function TimelineBlockEnter({ children }: { children: ReactNode }) {
  return <div className="agent-stream-timeline-block-enter">{children}</div>
}

export function AssistantStreamTimeline({
  timeline,
  stepStates,
  streamLive,
  streamFinished,
  messageKey,
  awaitingInteraction = false,
  thinkExpanded,
  fallbackThinkText,
  onThinkExpandedChange,
  onSubmitInteraction,
  pinOrchestrationOpen = false,
}: AssistantStreamTimelineProps) {
  const isMobile = useAppMobile()
  const [multiSelectDrafts, setMultiSelectDrafts] = useState<Record<string, AgentChoiceOption[]>>({})
  const [singleSelectDrafts, setSingleSelectDrafts] = useState<Record<string, AgentChoiceOption | undefined>>({})
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({})
  const effectiveTimeline = useMemo(() => {
    const result = timeline.length > 0 ? [...timeline] : []
    const hasThinkBlock = result.some((block) => block.kind === 'think')
    const hasThinkToolStep = stepStates.some(
      (s) => s.type === 'tool' && s.toolName === 'think',
    )
    // 仅旧消息回放：无 timeline 思考块时才用全局 thinkText 顶栏占位
    if (
      !hasThinkBlock &&
      !hasThinkToolStep &&
      fallbackThinkText?.trim() &&
      result.length === 0
    ) {
      result.unshift({
        kind: 'think',
        id: `think-fallback-${messageKey}`,
        text: fallbackThinkText.trim(),
        status: 'done',
      })
    }
    const toolStepIds = new Set(
      result.filter((block): block is Extract<AgentTimelineBlock, { kind: 'tool' }> => block.kind === 'tool')
        .map((block) => block.stepId),
    )
    for (const step of stepStates) {
      if (step.type !== 'tool' || toolStepIds.has(step.stepId)) {
        continue
      }
      if (isHiddenUiTool(step.toolName) || step.toolName === 'think') {
        continue
      }
      const toolBlock: Extract<AgentTimelineBlock, { kind: 'tool' }> = {
        kind: 'tool',
        id: `tool-synth:${step.stepId}`,
        stepId: step.stepId,
      }
      result.push(toolBlock)
      toolStepIds.add(step.stepId)
    }
    const normalized = pruneRedundantChoiceSelected(normalizeTimelineBlockIds(result))
    return normalized.filter(
      (block) =>
        block.kind !== 'think' ||
        shouldRenderThinkBlock(block, { streamLive, streamFinished }),
    )
  }, [timeline, stepStates, fallbackThinkText, messageKey, streamLive, streamFinished])

  const orchestrationOverview = useMemo(
    () =>
      orchestrationOverviewFromTimeline(effectiveTimeline, stepStates, {
        streamFinished,
        compact: isMobile,
      }),
    [effectiveTimeline, stepStates, streamFinished, isMobile],
  )

  const stepByTimelineBlockId = useMemo(() => {
    const assigned = new Set<string>()
    const map = new Map<string, AgentStepState>()
    for (const block of effectiveTimeline) {
      if (block.kind !== 'tool') {
        continue
      }
      let step = findStepState(stepStates, block.stepId)
      if (!step || assigned.has(step.stepId)) {
        step = findStepForTimelineTool(stepStates, block.stepId, assigned)
      }
      if (step) {
        assigned.add(step.stepId)
        map.set(block.id, step)
      }
    }
    return map
  }, [effectiveTimeline, stepStates])

  const { displayTimeline, mergedMemoryReadTitles, mergedMemoryReadCount } = useMemo(() => {
    const collapsed = collapseConsecutiveMemoryReads(effectiveTimeline, stepByTimelineBlockId)
    return {
      displayTimeline: collapsed.blocks,
      mergedMemoryReadTitles: collapsed.mergedMemoryReadTitles,
      mergedMemoryReadCount: collapsed.mergedMemoryReadCount,
    }
  }, [effectiveTimeline, stepByTimelineBlockId])

  const fullStreamText = useMemo(
    () =>
      effectiveTimeline
        .filter((block): block is Extract<AgentTimelineBlock, { kind: 'text' }> => block.kind === 'text')
        .map((block) => block.content)
        .join(''),
    [effectiveTimeline],
  )

  const streamTextLive = streamLive && !streamFinished

  const { visible: typewriterVisible } = useTypewriterBuffer(fullStreamText, {
    resetKey: messageKey,
    playing: streamTextLive,
    finished: streamFinished || !streamLive,
    maxCharsPerFrame: 8,
  })

  const globalVisible = typewriterVisible
  const globalVisibleLen = runeLength(globalVisible)
  const forceFullText = streamFinished || !streamLive

  const lastTextBlockId = useMemo(() => {
    const textBlocks = displayTimeline.filter(
      (b): b is Extract<AgentTimelineBlock, { kind: 'text' }> => b.kind === 'text',
    )
    return textBlocks.length ? textBlocks[textBlocks.length - 1].id : null
  }, [displayTimeline])

  const toggleMultiSelectChoice = (stepId: string, choice: AgentChoiceOption) => {
    setMultiSelectDrafts((prev) => {
      const current = prev[stepId] ?? []
      const exists = current.some((item) => item.id === choice.id)
      const next = exists
        ? current.filter((item) => item.id !== choice.id)
        : [...current, choice]
      return { ...prev, [stepId]: next }
    })
  }

  const canSubmitMultiSelect = (step: AgentStepState) => {
    const picked = multiSelectDrafts[step.stepId] ?? []
    const min = step.interaction?.min_select ?? 1
    const max = step.interaction?.max_select ?? Number.MAX_SAFE_INTEGER
    return picked.length >= min && picked.length <= max
  }

  const canInteractForStep = (step: AgentStepState) => {
    const hasAskUserQuestions =
      (isAskUserTool(step.toolName) || step.interaction?.type === 'ask_user') &&
      Boolean(step.interaction?.questions?.length)
    const pendingAskAnswer =
      hasAskUserQuestions &&
      !findChoiceSelectedForStep(effectiveTimeline, step.stepId)
    if (
      pendingAskAnswer &&
      (awaitingInteraction || (streamLive && !streamFinished))
    ) {
      return true
    }
    const hasChoices = Boolean(step.choices?.length)
    const hasInput = Boolean(step.interaction)
    if (step.status !== 'completed' || (!hasChoices && !hasInput && !hasAskUserQuestions)) {
      return false
    }
    return awaitingInteraction || (streamLive && !streamFinished)
  }

  const hasPendingAskUser = useMemo(
    () =>
      stepStates.some(
        (s) =>
          (isAskUserTool(s.toolName) || s.interaction?.type === 'ask_user') &&
          Boolean(s.interaction?.questions?.length) &&
          s.status === 'completed' &&
          !findChoiceSelectedForStep(effectiveTimeline, s.stepId),
      ),
    [stepStates, effectiveTimeline],
  )

  const timelineUnits = useMemo(
    () => groupTimelineUnits(displayTimeline, stepStates, { streamFinished }),
    [displayTimeline, stepStates, streamFinished],
  )

  const hasOrchestrationLayer = useMemo(
    () => timelineUnits.some((unit) => unit.kind === 'orchestration'),
    [timelineUnits],
  )

  const hasVisibleTool = useMemo(() => {
    if (
      stepStates.some(
        (s) => s.type === 'tool' && s.toolName && !isHiddenUiTool(s.toolName),
      )
    ) {
      return true
    }
    return displayTimeline.some((b) => b.kind === 'tool')
  }, [stepStates, displayTimeline])

  const showOrchestrationPending = useMemo(() => {
    if (!streamLive || streamFinished || awaitingInteraction) {
      return false
    }
    if (hasOrchestrationLayer) {
      return false
    }
    if (hasVisibleTool) {
      return false
    }
    const hasText = timelineUnits.some(
      (unit) =>
        unit.kind === 'segment' && unit.blocks.some((b) => b.kind === 'text' && b.content.trim()),
    )
    return !hasText
  }, [
    streamLive,
    streamFinished,
    awaitingInteraction,
    hasOrchestrationLayer,
    hasVisibleTool,
    timelineUnits,
  ])

  const showOrchestrationResume = useMemo(
    () =>
      shouldShowOrchestrationResumeGap({
        timelineUnits,
        timeline: effectiveTimeline,
        stepStates,
        streamLive,
        streamFinished,
        awaitingInteraction,
      }),
    [
      timelineUnits,
      effectiveTimeline,
      stepStates,
      streamLive,
      streamFinished,
      awaitingInteraction,
    ],
  )

  if (!streamLive && !displayTimeline.length) {
    return null
  }

  let textOffset = 0

  const renderBlock = (
    block: AgentTimelineBlock,
    blockKey: string,
    tier: 'primary' | 'nested' = 'primary',
    options?: {
      hidePlanningInsight?: boolean
      toolNested?: boolean
      suppressToolStatus?: boolean
      insideMetaRail?: boolean
    },
  ): ReactNode => {
    if (
      options?.hidePlanningInsight &&
      (block.kind === 'think' || block.kind === 'reasoning')
    ) {
      return null
    }
    if (block.kind === 'reasoning') {
      return (
        <TimelineBlockEnter key={blockKey}>
          <PlanReasoningBlock
            block={block}
            messageKey={messageKey}
            streamLive={streamLive}
            streamFinished={streamFinished}
          />
        </TimelineBlockEnter>
      )
    }
    if (block.kind === 'think') {
      if (!shouldRenderThinkBlock(block, { streamLive, streamFinished })) {
        return null
      }
      const thinkPanel = (
        <ThinkBlock
          block={block}
          messageKey={messageKey}
          streamLive={streamLive}
          streamFinished={streamFinished}
          thinkExpanded={thinkExpanded}
          onThinkExpandedChange={onThinkExpandedChange}
          isolateExpand={tier === 'nested'}
        />
      )
      if (tier === 'primary') {
        return (
          <TimelineBlockEnter key={blockKey}>
            <div className={TIMELINE_THINK_WRAP}>
              {thinkPanel}
            </div>
          </TimelineBlockEnter>
        )
      }
      return (
        <TimelineBlockEnter key={blockKey}>
          {thinkPanel}
        </TimelineBlockEnter>
      )
    }

    if (block.kind === 'text') {
      const content = block.content
      if (isToolErrorLikeText(content)) {
        return null
      }
      const blockLen = runeLength(content)
      const blockStart = textOffset
      const visible = visiblePrefixForBlock(
        content,
        textOffset,
        globalVisibleLen,
        forceFullText,
      )
      textOffset += blockLen
      if (!visible.trim()) {
        return null
      }
      const blockEnd = blockStart + blockLen
      const showStreamCursor =
        streamTextLive &&
        (globalVisibleLen > blockStart && globalVisibleLen <= blockEnd ||
          (block.id === lastTextBlockId && globalVisibleLen >= blockEnd))
      return (
        <TimelineBlockEnter key={blockKey}>
          <TimelineDeliveryBlock
            text={visible}
            streamLive={showStreamCursor}
            testId="timeline-delivery-text"
          />
        </TimelineBlockEnter>
      )
    }

    if (block.kind === 'transition') {
      return null
    }

    if (block.kind === 'choice_selected') {
      if (block.stepId) {
        return null
      }
      return <SelectedChoiceSummary key={blockKey} selection={block} />
    }

    if (block.kind === 'tool') {
      let step = stepByTimelineBlockId.get(block.id)
      if (!step && block.stepId) {
        const direct = findStepState(stepStates, block.stepId)
        if (direct) {
          step = direct
        } else if (streamLive && !streamFinished) {
          step = {
            stepId: block.stepId,
            type: 'tool',
            status: 'started',
            title: '执行中…',
          }
        }
      }
      if (!step) {
        return null
      }
      const internalTool = isHiddenUiTool(step.toolName)
      if (internalTool) {
        return null
      }
      const resolvedSelection = findChoiceSelectedForStep(effectiveTimeline, step.stepId)
      const showAskUser =
        canInteractForStep(step) &&
        (isAskUserTool(step.toolName) || step.interaction?.type === 'ask_user') &&
        Boolean(step.interaction?.questions?.length) &&
        !resolvedSelection
      const canInteract = canInteractForStep(step)
      const showChoices =
        canInteract &&
        Boolean(step.choices?.length) &&
        !resolvedSelection
      const showChooseLoading =
        isAskUserTool(step.toolName) &&
        step.status === 'started' &&
        !showChoices &&
        !showAskUser
      const showUserInputOnly =
        canInteract &&
        step.interaction?.type === 'user_input' &&
        (!step.choices || step.choices.length === 0)
      const showInteraction =
        (canInteract && (showChoices || showUserInputOnly)) || showAskUser
      const toolLoading = step.status === 'started' && !showChooseLoading
      const toolNode = (
        <TimelineToolBlock
          step={step}
          toolLoading={toolLoading}
          showChooseLoading={showChooseLoading}
          showInteraction={showInteraction}
          nested={options?.toolNested ?? tier === 'nested'}
          suppressStatus={
            options?.suppressToolStatus !== undefined
              ? options.suppressToolStatus
              : tier === 'nested'
          }
          memoryReadTitles={mergedMemoryReadTitles.get(block.id)}
          mergedCallCount={mergedMemoryReadCount.get(block.id)}
        >
          {showInteraction ? (
            <div className={CHOICE_LIST}>
              {showAskUser && step.interaction ? (
                <AskUserForm
                  interaction={step.interaction}
                  onSubmit={(answers) =>
                    onSubmitInteraction?.(step.interaction!, { answers })
                  }
                />
              ) : null}
              {!showAskUser && step.interaction?.prompt ? (
                <div className={STEP_PROMPT}>{step.interaction.prompt}</div>
              ) : null}
              {!showAskUser && showChoices && (
                <StaggeredChoices
                  choices={step.choices!}
                  stepId={step.stepId}
                  interaction={step.interaction}
                  multiSelected={multiSelectDrafts[step.stepId] ?? []}
                  singleSelectedId={singleSelectDrafts[step.stepId]?.id}
                  onToggle={(choice) => toggleMultiSelectChoice(step.stepId, choice)}
                  onSelectSingle={(choice) => {
                    setSingleSelectDrafts((prev) => ({ ...prev, [step.stepId]: choice }))
                    if (step.interaction?.type === 'single_select') {
                      onSubmitInteraction?.(step.interaction, { choice })
                    }
                  }}
                />
              )}
              {!showAskUser && step.interaction?.type === 'multi_select' && showChoices && (
                <div className={MULTI_SELECT_ACTIONS}>
                  <span className={MULTI_SELECT_HINT}>
                    已选 {(multiSelectDrafts[step.stepId] ?? []).length} 项
                  </span>
                  <EditorButton
                    variant="tool"
                    size="sm"
                    type="button"
                    disabled={!canSubmitMultiSelect(step)}
                    onClick={() =>
                      onSubmitInteraction?.(step.interaction!, {
                        selected: multiSelectDrafts[step.stepId] ?? [],
                      })
                    }
                  >
                    提交选择
                  </EditorButton>
                </div>
              )}
              {!showAskUser && step.interaction?.type === 'single_select' && showChoices && (
                <div className={MULTI_SELECT_ACTIONS}>
                  <span className={MULTI_SELECT_HINT}>点选一项即可继续</span>
                </div>
              )}
              {!showAskUser && (showUserInputOnly || step.interaction?.allow_custom) && (
                <div className={CUSTOM_INPUT_ROW}>
                  {step.interaction?.free_text_hint ? (
                    <span className={CUSTOM_HINT}>{step.interaction.free_text_hint}</span>
                  ) : null}
                  <input
                    type="text"
                    className={CUSTOM_INPUT}
                    value={customDrafts[step.stepId] ?? ''}
                    placeholder="输入你的创作方向或补充说明…"
                    onChange={(e) =>
                      setCustomDrafts((prev) => ({
                        ...prev,
                        [step.stepId]: e.target.value,
                      }))
                    }
                  />
                  <EditorButton
                    variant="tool"
                    size="sm"
                    type="button"
                    disabled={!(customDrafts[step.stepId] ?? '').trim()}
                    onClick={() => {
                      const text = (customDrafts[step.stepId] ?? '').trim()
                      if (!text || !step.interaction) return
                      onSubmitInteraction?.(step.interaction, { customText: text })
                    }}
                  >
                    提交自定义方向
                  </EditorButton>
                </div>
              )}
            </div>
          ) : null}
          {resolvedSelection && !showAskUser ? (
            <SelectedChoiceSummary
              selection={resolvedSelection}
              badge={
                isAskUserTool(step.toolName) || step.interaction?.type === 'ask_user'
                  ? '你的回答'
                  : '你的选择'
              }
            />
          ) : null}
        </TimelineToolBlock>
      )
      return (
        <TimelineBlockEnter key={blockKey}>
          {toolNode}
        </TimelineBlockEnter>
      )
    }

    return null
  }

  const renderToolBlock = (
    block: Extract<AgentTimelineBlock, { kind: 'tool' }>,
    blockKey: string,
    nested = true,
  ) =>
    renderBlock(block, blockKey, nested ? 'nested' : 'primary', {
      toolNested: nested,
      suppressToolStatus: false,
    })

  const renderTimelineUnit = (
    unit: (typeof timelineUnits)[number],
    unitKey: string,
  ): ReactNode => {
    if (unit.kind === 'orchestration') {
      return (
        <OrchestrationLayer
          key={unitKey}
          rounds={unit.rounds}
          status={unit.status}
          stepStates={stepStates}
          streamLive={streamLive}
          streamFinished={streamFinished}
          messageKey={`${messageKey}:${unitKey}`}
          thinkExpanded={thinkExpanded}
          onThinkExpandedChange={onThinkExpandedChange}
          pinExpanded={pinOrchestrationOpen || awaitingInteraction || hasPendingAskUser}
          orchestrationOverview={orchestrationOverview}
          renderTool={(block, blockKey) => {
            const exposure = isSiblingExposureBlock(block, stepStates)
            return renderToolBlock(block, blockKey, !exposure)
          }}
        />
      )
    }
    if (unit.kind === 'think_round') {
      return (
        <ThinkRoundGroup
          key={unitKey}
          items={unit.items}
          stepStates={stepStates}
          streamLive={streamLive}
          streamFinished={streamFinished}
          messageKey={`${messageKey}:${unitKey}`}
          thinkExpanded={thinkExpanded}
          onThinkExpandedChange={onThinkExpandedChange}
          orchestrationActive={streamLive && !streamFinished}
          flatAlign
          railContext={{ showThinkRail: false }}
          renderTool={(block, blockKey) => {
            const exposure = isSiblingExposureBlock(block, stepStates)
            return renderToolBlock(block, blockKey, !exposure)
          }}
        />
      )
    }
    if (unit.kind === 'planning') {
      return (
        <PlanningStack
          key={unitKey}
          transition={unit.transition}
          blocks={unit.blocks}
          stepStates={stepStates}
          streamLive={streamLive}
          streamFinished={streamFinished}
          awaitingInteraction={awaitingInteraction}
        >
          {unit.blocks.map((block, index) =>
            renderBlock(
              block,
              `${unitKey}:${index}:${block.kind}:${block.id}`,
              block.kind === 'tool' ? 'nested' : 'primary',
              block.kind === 'tool' ? { toolNested: true } : undefined,
            ),
          )}
        </PlanningStack>
      )
    }
    if (unit.kind === 'segment') {
      return unit.blocks.map((block, index) =>
        renderBlock(
          block,
          `${unitKey}:${index}:${block.kind}:${block.id}`,
          block.kind === 'tool' ? 'nested' : 'primary',
          block.kind === 'tool'
            ? {
                toolNested: !isSiblingExposureBlock(block, stepStates),
              }
            : undefined,
        ),
      )
    }
    return null
  }

  return (
    <div
      className={TIMELINE_COLUMN}
      data-testid="agent-stream-timeline"
    >
      <div className={TIMELINE_SLOT}>
        {showOrchestrationPending ? <OrchestrationPendingRow /> : null}
        {timelineUnits.map((unit, unitIndex) => (
          <Fragment key={`unit:${unitIndex}`}>
            {renderTimelineUnit(unit, String(unitIndex))}
          </Fragment>
        ))}
        {showOrchestrationResume ? (
          <OrchestrationLayer
            key={`${messageKey}:orchestration-resume`}
            rounds={[]}
            status="active"
            stepStates={stepStates}
            streamLive={streamLive}
            streamFinished={streamFinished}
            messageKey={`${messageKey}:orchestration-resume`}
            thinkExpanded={thinkExpanded}
            onThinkExpandedChange={onThinkExpandedChange}
            pinExpanded
            orchestrationOverview={orchestrationOverview}
            renderTool={() => null}
          />
        ) : null}
      </div>
    </div>
  )
}
