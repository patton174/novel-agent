import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import type { AgentStepState } from '../../../types/agent'
import { chapterWriteProgressHint } from '../../../utils/chapterProgress'
import {
  isAskUserTool,
  isChapterWriteTool,
  isCollapsibleReadTool,
  isMemoryVfsPath,
  isVfsReadTool,
  normalizeToolName,
  vfsPathFromPayload,
} from '../../../utils/agentToolNames'
import {
  ccToolArgsSubtitle,
  ccToolNameLabel,
  ccToolResultHint,
  readToolBranchLabels,
} from '../../../utils/ccToolDisplay'
import {
  readToolBodyExcerpt,
  toolDetailHasExpandableContent,
} from '../../../utils/toolDetailFormat'
import { containsToolUseError } from '../../../utils/toolErrorText'
import { CcToolRow, CcToolNestedBranch } from './CcToolRow'
import { SubagentPanel } from './SubagentPanel'
import { resolveToolVisualStatus } from './TimelineLeadIcon'
import { TimelineTodoList } from './TimelineTodoList'
import { ToolDetailPeek } from './ToolDetailPeek'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import {
  CcProgressHint,
  FailTag,
  PlanningNestedHint,
  ToolDetail,
} from './timelineStyles'

export function TimelineToolBlock({
  step,
  toolLoading,
  showChooseLoading,
  showInteraction,
  nested = false,
  memoryReadTitles,
  mergedCallCount,
  suppressStatus,
  children,
}: {
  step: AgentStepState
  toolLoading: boolean
  showChooseLoading: boolean
  showInteraction: boolean
  nested?: boolean
  memoryReadTitles?: string[]
  mergedCallCount?: number
  suppressStatus?: boolean
  children?: ReactNode
}) {
  const isAsk = isAskUserTool(step.toolName)
  const suppress = Boolean(suppressStatus)
  const readTool = isCollapsibleReadTool(step.toolName)
  const vfsRead = isVfsReadTool(step.toolName)
  const agentToolEarly = normalizeToolName(step.toolName) === 'Agent'
  if (step.subagent) {
    return <SubagentPanel subagent={step.subagent} loading={toolLoading} />
  }
  if (agentToolEarly) {
    const phase = toolLoading
      ? '运行中'
      : step.status === 'failed'
        ? '失败'
        : step.status === 'completed'
          ? '已完成'
          : undefined
    return (
      <CcToolRow
        testId={`timeline-tool-${step.stepId}`}
        name={step.title?.trim() || step.detail?.trim() || '子代理'}
        args={step.toolArgs ?? ''}
        phase={phase}
        phaseActive={toolLoading}
        iconName="Agent"
        iconStatus={resolveToolVisualStatus({
          loading: toolLoading,
          error: step.status === 'failed',
          success: step.status === 'completed',
        })}
      />
    )
  }

  const name = ccToolNameLabel(step)
  const args = isAsk ? '' : ccToolArgsSubtitle(step)
  const vfsPath = step.toolInput
    ? vfsPathFromPayload(step.toolInput as Record<string, unknown>)
    : ''
  const branchLabels = readTool ? readToolBranchLabels(step) : null
  const memoryDetail =
    branchLabels?.[0] &&
    (readTool ||
      /^memory_/.test(step.toolName ?? '') ||
      isMemoryVfsPath(vfsPath))
      ? branchLabels[0]
      : null
  const readLabel =
    memoryReadTitles && memoryReadTitles.length > 0
      ? memoryReadTitles.join('、')
      : branchLabels?.length && readTool
        ? branchLabels.join('、')
        : memoryDetail && readTool
          ? memoryDetail
          : null
  const readBodyExcerpt =
    readTool && (!mergedCallCount || mergedCallCount <= 1)
      ? readToolBodyExcerpt(step)
      : undefined
  const deleteSummary =
    normalizeToolName(step.toolName) === 'Delete'
      ? (step.outputSummary || step.resultLabels?.[0] || '').trim() || null
      : null
  const memoryActionLabel =
    memoryDetail && !readTool && !deleteSummary ? memoryDetail : null
  const readProgressHint =
    toolLoading && vfsRead && step.detail?.trim() ? step.detail.trim() : undefined
  const chapterWriteTool = isChapterWriteTool(step.toolName)
  const todoWriteTool = normalizeToolName(step.toolName) === 'TodoWrite'
  const vfsInventoryTool =
    normalizeToolName(step.toolName) === 'Glob' ||
    normalizeToolName(step.toolName) === 'Grep'
  const hasTodoList = Boolean(step.todos?.length)
  const chapterProgressHint =
    chapterWriteTool && toolLoading ? chapterWriteProgressHint(step) : null
  const rawSummary = step.outputSummary || step.detail
  const hideAskNoise =
    isAsk &&
    Boolean(
      rawSummary?.match(/waiting for user|等待你的回复/i),
    )
  const loading = toolLoading || showChooseLoading
  const error = step.status === 'failed'
  const resolved = step.status === 'completed' && !loading
  const iconName = step.toolName ?? 'Tool'
  const iconStatus = resolveToolVisualStatus({ loading, error, success: resolved })
  const toolErrorText =
    error && containsToolUseError(rawSummary) ? rawSummary : undefined

  const chapterResultSummary =
    chapterWriteTool && resolved && !error
      ? (step.outputSummary || step.resultLabels?.[0] || '').trim() || null
      : null
  const summary =
    isAsk ||
    deleteSummary ||
    chapterResultSummary ||
    hideAskNoise ||
    toolErrorText ||
    todoWriteTool
      ? undefined
      : rawSummary
  const showVerboseSummary = Boolean(toolErrorText)
  const showFailedDetail =
    Boolean(summary) &&
    step.status === 'failed' &&
    !readLabel &&
    !memoryActionLabel &&
    !deleteSummary &&
    !toolErrorText

  if (
    suppress &&
    !isAsk &&
    !loading &&
    resolved &&
    !showInteraction &&
    !showChooseLoading
  ) {
    const compactHint = readLabel || memoryActionLabel || deleteSummary
    if (!compactHint && !children) {
      return null
    }
    return (
      <>
        {compactHint ? (
          <PlanningNestedHint>{compactHint}</PlanningNestedHint>
        ) : null}
        {children}
      </>
    )
  }

  const rightHint = (text: string) =>
    toolLoading || showChooseLoading ? (
      <ShimmerScanText active>{text}</ShimmerScanText>
    ) : (
      text
    )

  const trailing = (
    <>
      {error ? <FailTag>失败</FailTag> : null}
      {showChooseLoading ? (
        <CcProgressHint>{rightHint('正在生成选项…')}</CcProgressHint>
      ) : null}
      {!suppress && readProgressHint && !chapterProgressHint ? (
        <CcProgressHint>{rightHint(readProgressHint)}</CcProgressHint>
      ) : null}
      {!suppress &&
      toolLoading &&
      step.detail &&
      !chapterProgressHint &&
      !readProgressHint ? (
        <CcProgressHint>{rightHint(step.detail)}</CcProgressHint>
      ) : null}
    </>
  )

  const branchInner: ReactNode[] = []
  if (toolLoading && readLabel) {
    branchInner.push(
      <ShimmerScanText key="read-progress" active>
        {readLabel}
      </ShimmerScanText>,
    )
  } else if (readLabel && readBodyExcerpt) {
    branchInner.push(
      <span key="body" style={{ display: 'block' }}>
        <ToolDetailPeek step={step} mergedCallCount={mergedCallCount} />
      </span>,
    )
  } else if (
    vfsInventoryTool &&
    resolved &&
    toolDetailHasExpandableContent(step)
  ) {
    branchInner.push(
      <ToolDetailPeek
        key="vfs-inventory-tree"
        step={step}
        mergedCallCount={mergedCallCount}
      />,
    )
  } else if (chapterProgressHint) {
    branchInner.push(
      <ShimmerScanText key="chapter-progress" active>
        {chapterProgressHint}
      </ShimmerScanText>,
    )
    if (toolLoading && step.displayExcerpt?.trim()) {
      branchInner.push(
        <span key="chapter-stream" style={{ display: 'block', marginTop: '0.35rem' }}>
          <ShimmerScanText active>
            {step.displayExcerpt.trim().slice(-400)}
          </ShimmerScanText>
        </span>,
      )
    }
  } else if (todoWriteTool && toolLoading) {
    branchInner.push(
      <ShimmerScanText key="todo-progress" active>
        更新待办…
      </ShimmerScanText>,
    )
  } else if (toolLoading && step.displayExcerpt?.trim()) {
    branchInner.push(
      <ShimmerScanText key="stream-excerpt" active>
        {step.displayExcerpt.trim().slice(-400)}
      </ShimmerScanText>,
    )
  } else if (
    toolLoading &&
    !showInteraction &&
    !showChooseLoading &&
    !chapterProgressHint &&
    !readLabel
  ) {
    branchInner.push('…')
  }

  if (chapterWriteTool && resolved && toolDetailHasExpandableContent(step)) {
    branchInner.push(
      <ToolDetailPeek
        key="chapter-write-detail"
        step={step}
        mergedCallCount={mergedCallCount}
      />,
    )
  }

  const detailBranch = branchInner.length > 0 ? <>{branchInner}</> : null
  const chapterWriteInBranch =
    Boolean(chapterResultSummary) ||
    (chapterWriteTool && resolved && toolDetailHasExpandableContent(step))

  const showBodySummary = Boolean(
    !readLabel &&
      !memoryActionLabel &&
      !deleteSummary &&
      !vfsRead &&
      !chapterWriteTool &&
      !vfsInventoryTool &&
      !todoWriteTool &&
      !hasTodoList &&
      !isAsk &&
      resolved &&
      summary &&
      !showInteraction,
  )

  const showDetailPeek =
    !toolErrorText &&
    !todoWriteTool &&
    !hasTodoList &&
    !isAsk &&
    !deleteSummary &&
    !chapterWriteInBranch &&
    !vfsInventoryTool &&
    !(readLabel && readBodyExcerpt) &&
    (step.status === 'completed' ||
      (step.status === 'failed' && !showFailedDetail) ||
      Boolean(step.displayExcerpt)) &&
    (readTool
      ? Boolean(readBodyExcerpt) && !readLabel
      : !readLabel && !memoryActionLabel)

  const resultHint = ccToolResultHint(step, {
    readLabel,
    deleteSummary,
    chapterResultSummary,
    memoryActionLabel,
    loading,
  })
  const awaitingUserInput = Boolean(showInteraction)
  const phase = loading
    ? '运行中'
    : error
      ? '失败'
      : awaitingUserInput && isAsk
        ? '等待回答'
        : resolved
          ? '已完成'
          : undefined
  const hasExpandableDetail = Boolean(
    detailBranch ||
      showVerboseSummary ||
      showBodySummary ||
      showDetailPeek ||
      (hasTodoList && step.todos) ||
      children,
  )

  if (
    !nested &&
    !children &&
    !showVerboseSummary &&
    !showBodySummary &&
    !detailBranch &&
    !trailing &&
    !showDetailPeek &&
    !hasTodoList
  ) {
    return (
      <CcToolRow
        testId={`timeline-tool-${step.stepId}`}
        name={name}
        args={args}
        phase={phase}
        phaseActive={loading}
        resultHint={resultHint}
        mergeCount={mergedCallCount}
        iconName={iconName}
        iconStatus={iconStatus}
      />
    )
  }

  return (
    <ExpandableTimelineToolRow
      stepId={step.stepId}
      loading={loading}
      resolved={resolved}
      awaitingUserInput={awaitingUserInput}
      name={name}
      args={args}
      phase={phase}
      resultHint={resultHint}
      mergeCount={mergedCallCount}
      iconName={iconName}
      iconStatus={iconStatus}
      trailing={trailing}
      branch={detailBranch}
      hasExpandableDetail={hasExpandableDetail}
      showVerboseSummary={showVerboseSummary}
      showBodySummary={showBodySummary}
      showFailedDetail={showFailedDetail}
      toolErrorText={toolErrorText}
      summary={summary}
      hasTodoList={hasTodoList}
      todos={step.todos}
      showDetailPeekNode={
        showDetailPeek ? (
          <ToolDetailPeek step={step} mergedCallCount={mergedCallCount} />
        ) : null
      }
    >
      {children ?? null}
    </ExpandableTimelineToolRow>
  )
}

function ExpandableTimelineToolRow({
  stepId,
  loading,
  resolved,
  awaitingUserInput = false,
  name,
  args,
  phase,
  resultHint,
  mergeCount,
  iconName,
  iconStatus,
  trailing,
  branch,
  hasExpandableDetail,
  showVerboseSummary,
  showBodySummary,
  showFailedDetail,
  toolErrorText,
  summary,
  hasTodoList,
  todos,
  showDetailPeekNode,
  children,
}: {
  stepId: string
  loading: boolean
  resolved: boolean
  awaitingUserInput?: boolean
  name: string
  args: string
  phase?: string
  resultHint: string | null
  mergeCount?: number
  iconName: string
  iconStatus: ReturnType<typeof resolveToolVisualStatus>
  trailing: ReactNode
  branch: ReactNode
  hasExpandableDetail: boolean
  showVerboseSummary: boolean
  showBodySummary: boolean
  showFailedDetail: boolean
  toolErrorText: string | undefined
  summary: string | undefined
  hasTodoList: boolean
  todos?: AgentStepState['todos']
  showDetailPeekNode: ReactNode
  children?: ReactNode
}) {
  const [bodyExpanded, setBodyExpanded] = useState(false)
  const collapsible = hasExpandableDetail && !loading && !awaitingUserInput
  const expanded = loading || awaitingUserInput || bodyExpanded

  useEffect(() => {
    if (loading || awaitingUserInput) {
      setBodyExpanded(true)
    }
  }, [loading, awaitingUserInput, stepId])

  useEffect(() => {
    if (awaitingUserInput) {
      return
    }
    if (!loading && resolved && hasExpandableDetail) {
      setBodyExpanded(false)
    }
  }, [loading, resolved, hasExpandableDetail, awaitingUserInput, stepId])

  return (
    <CcToolRow
      testId={`timeline-tool-${stepId}`}
      name={name}
      args={args}
      phase={phase}
      phaseActive={loading}
      resultHint={resultHint}
      mergeCount={mergeCount}
      iconName={iconName}
      iconStatus={iconStatus}
      trailing={trailing}
      branch={branch}
      collapsible={collapsible}
      expanded={expanded}
      onToggle={() => setBodyExpanded((open) => !open)}
    >
      {showVerboseSummary ? (
        <CcToolNestedBranch>
          <ToolDetail $error>{toolErrorText}</ToolDetail>
        </CcToolNestedBranch>
      ) : null}
      {showFailedDetail ? (
        <CcToolNestedBranch>
          <ToolDetail $error>{summary}</ToolDetail>
        </CcToolNestedBranch>
      ) : null}
      {showBodySummary ? (
        <CcToolNestedBranch>
          <ToolDetail>{summary}</ToolDetail>
        </CcToolNestedBranch>
      ) : null}
      {hasTodoList && todos ? (
        <CcToolNestedBranch>
          <TimelineTodoList todos={todos} />
        </CcToolNestedBranch>
      ) : null}
      {showDetailPeekNode ? (
        <CcToolNestedBranch>{showDetailPeekNode}</CcToolNestedBranch>
      ) : null}
      {children}
    </CcToolRow>
  )
}
