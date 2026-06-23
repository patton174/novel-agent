import type { ReactNode } from 'react'
import type { AgentStepState } from '../../../types/agent'
import { chapterWriteProgressHint } from '../../../utils/chapterProgress'
import {
  canonicalToolName,
  isAskUserTool,
  isChapterWriteTool,
  isCollapsibleReadTool,
  isInventoryListTool,
  isListChaptersTool,
  isMemoryApiTool,
  isMemoryListTool,
  isMemoryVfsPath,
  isMemoryWriteTool,
  isVfsReadTool,
  normalizeToolName,
  vfsPathFromPayload,
} from '../../../utils/agentToolNames'
import { planningActiveLabel } from '../../../utils/agentOrchestration'
import {
  ccToolArgsSubtitle,
  ccToolBranchStatus,
  ccToolInlineResult,
  ccToolNameLabel,
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
import { PLANNING_NESTED_HINT, toolDetailClass } from '@/lib/timelineClasses'

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
  if (step.subagent) {
    return <SubagentPanel subagent={step.subagent} loading={toolLoading} />
  }
  const agentToolEarly = normalizeToolName(step.toolName) === 'Agent'
  if (agentToolEarly) {
    const loading = toolLoading
    const error = step.status === 'failed'
    const resolved = step.status === 'completed' && !loading
    const inlineResult = ccToolInlineResult(step, {
      loading,
      error,
      toolErrorText: error ? step.outputSummary?.trim() : undefined,
    })
    return (
      <CcToolRow
        testId={`timeline-tool-${step.stepId}`}
        name={step.title?.trim() || step.detail?.trim() || '子代理'}
        phaseActive={loading}
        outcomeBadge={
          loading ? null : error ? 'error' : resolved ? 'success' : null
        }
        inlineResult={
          inlineResult ??
          (loading
            ? '子代理运行中…'
            : error
              ? '子代理失败'
              : resolved
                ? step.outputSummary?.trim() || null
                : null)
        }
        iconName="Agent"
        iconStatus={resolveToolVisualStatus({ loading, error, success: resolved })}
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
  const chapterWriteTool = isChapterWriteTool(step.toolName)
  const chapterProgressHint =
    chapterWriteTool && toolLoading ? chapterWriteProgressHint(step) : null
  const readProgressHint =
    toolLoading && vfsRead && step.detail?.trim() ? step.detail.trim() : undefined
  const earlyProgressHint =
    toolLoading && !chapterProgressHint && !readProgressHint
      ? planningActiveLabel(step.toolName ?? '') ??
        (step.title?.trim() && !step.title.includes('…') ? `${step.title}…` : null)
      : null
  const rawTool = canonicalToolName(step.toolName)
  const todoWriteTool = normalizeToolName(step.toolName) === 'TodoWrite'
  const vfsInventoryTool = rawTool === 'Glob' || rawTool === 'Grep'
  const memoryTreeTool = isMemoryListTool(step.toolName)
  const memoryWriteTool = isMemoryWriteTool(step.toolName)
  const memoryApiTool = isMemoryApiTool(step.toolName)
  const listChaptersTool = isListChaptersTool(step.toolName)
  const inventoryListTool = isInventoryListTool(step.toolName)
  const hasTodoList = Boolean(step.todos?.length)
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
          <div className={PLANNING_NESTED_HINT}>{compactHint}</div>
        ) : null}
        {children}
      </>
    )
  }

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

  const branchLine = ccToolBranchStatus(step, {
    loading,
    error,
    phase,
    readLabel,
    chapterProgressHint,
    readProgressHint,
    earlyProgressHint,
    awaitingUserInput,
    chooseLoading: showChooseLoading,
  })

  const inlineResult = ccToolInlineResult(step, {
    loading,
    error,
    readLabel,
    chapterProgressHint,
    readProgressHint,
    earlyProgressHint,
    awaitingUserInput,
    chooseLoading: showChooseLoading,
    toolErrorText,
  })

  const resultSnippet = (step.resultLabels?.[0] || step.outputSummary || '').trim()
  const effectiveInlineResult =
    inlineResult ||
    (resolved && resultSnippet && !containsToolUseError(resultSnippet)
      ? resultSnippet.length > 96
        ? `${resultSnippet.slice(0, 96)}…`
        : resultSnippet
      : null)

  const branchInner: ReactNode[] = []
  if (toolLoading && readLabel && readBodyExcerpt) {
    branchInner.push(
      <span key="body" style={{ display: 'block' }}>
        <ToolDetailPeek step={step} mergedCallCount={mergedCallCount} />
      </span>,
    )
  } else if (
    vfsInventoryTool &&
    !inventoryListTool &&
    resolved &&
    !effectiveInlineResult &&
    toolDetailHasExpandableContent(step)
  ) {
    branchInner.push(
      <ToolDetailPeek
        key="vfs-inventory-tree"
        step={step}
        mergedCallCount={mergedCallCount}
      />,
    )
  } else if (chapterProgressHint && toolLoading && step.displayExcerpt?.trim()) {
    branchInner.push(
      <span key="chapter-stream" style={{ display: 'block', marginTop: '0.35rem' }}>
        {step.displayExcerpt.trim().slice(-400)}
      </span>,
    )
  } else if (
    toolLoading &&
    step.displayExcerpt?.trim() &&
    !chapterProgressHint &&
    !readLabel &&
    !memoryApiTool &&
    !listChaptersTool
  ) {
    branchInner.push(
      <span key="stream-excerpt" style={{ display: 'block' }}>
        {step.displayExcerpt.trim().slice(-400)}
      </span>,
    )
  }

  if (chapterWriteTool && resolved && toolDetailHasExpandableContent(step)) {
    branchInner.push(
      <ToolDetailPeek
        key="chapter-write-detail"
        step={step}
        mergedCallCount={mergedCallCount}
      />,
    )
  } else if (
    (memoryApiTool || memoryTreeTool || listChaptersTool || inventoryListTool) &&
    resolved &&
    !error &&
    !effectiveInlineResult &&
    toolDetailHasExpandableContent(step)
  ) {
    branchInner.push(
      <ToolDetailPeek
        key="memory-list-detail"
        step={step}
        mergedCallCount={mergedCallCount}
      />,
    )
  } else if (readTool && resolved && !error && readBodyExcerpt && toolDetailHasExpandableContent(step)) {
    branchInner.push(
      <ToolDetailPeek step={step} mergedCallCount={mergedCallCount} key="read-detail" />,
    )
  }

  const detailBranch = branchInner.length > 0 ? <>{branchInner}</> : null
  const chapterWriteInBranch =
    Boolean(chapterResultSummary) ||
    (chapterWriteTool && resolved && toolDetailHasExpandableContent(step))

  const compactBranchSummary = Boolean(
    resolved &&
      (step.outputSummary?.trim() || step.resultLabels?.[0]?.trim() || memoryActionLabel),
  )

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
      !memoryWriteTool &&
      !memoryTreeTool &&
      !listChaptersTool &&
      !compactBranchSummary &&
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
    !memoryWriteTool &&
    !memoryTreeTool &&
    !listChaptersTool &&
    !compactBranchSummary &&
    !showBodySummary &&
    !(readLabel && readBodyExcerpt) &&
    (step.status === 'completed' ||
      (step.status === 'failed' && !showFailedDetail) ||
      Boolean(step.displayExcerpt)) &&
    (readTool
      ? Boolean(readBodyExcerpt) && !readLabel
      : !readLabel && !memoryActionLabel)

  const suppressInventoryDetail = Boolean(
    (memoryApiTool ||
      memoryTreeTool ||
      listChaptersTool ||
      inventoryListTool ||
      vfsInventoryTool) &&
      (compactBranchSummary || Boolean(effectiveInlineResult?.trim()) || loading),
  )

  const hasExpandableDetail = Boolean(
    !suppressInventoryDetail &&
      (detailBranch ||
        showVerboseSummary ||
        showBodySummary ||
        showDetailPeek ||
        (hasTodoList && step.todos) ||
        children),
  )

  const outcomeBadge = loading
    ? null
    : error
      ? 'error'
      : resolved || awaitingUserInput
        ? 'success'
        : null

  const displayBranchLine =
    hasExpandableDetail && loading && args?.trim()
      ? `${branchLine} · ${args.trim()}`
      : hasExpandableDetail
        ? branchLine
        : null

  const forceCompactRow =
    !children &&
    !loading &&
    resolved &&
    !error &&
    !showInteraction &&
    !hasTodoList &&
    !showVerboseSummary &&
    !detailBranch &&
    !effectiveInlineResult &&
    (readTool || listChaptersTool || memoryTreeTool || memoryApiTool || inventoryListTool)

  const compactNestedRow =
    nested &&
    !children &&
    !loading &&
    resolved &&
    !error &&
    !showInteraction &&
    !hasTodoList &&
    !showVerboseSummary &&
    !detailBranch &&
    !showDetailPeek &&
    !hasExpandableDetail

  if (
    forceCompactRow ||
    compactNestedRow ||
    (!nested &&
      !children &&
      !showVerboseSummary &&
      !showBodySummary &&
      !detailBranch &&
      !showDetailPeek &&
      !hasTodoList &&
      !hasExpandableDetail)
  ) {
    return (
      <CcToolRow
        testId={`timeline-tool-${step.stepId}`}
        name={name}
        phaseActive={loading}
        outcomeBadge={outcomeBadge}
        inlineResult={effectiveInlineResult}
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
      branchLine={displayBranchLine}
      inlineResult={effectiveInlineResult}
      mergeCount={mergedCallCount}
      iconName={iconName}
      iconStatus={iconStatus}
      outcomeBadge={outcomeBadge}
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
  awaitingUserInput = false,
  name,
  branchLine,
  inlineResult,
  mergeCount,
  iconName,
  iconStatus,
  outcomeBadge,
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
  branchLine: string | null | undefined
  inlineResult?: string | null
  mergeCount?: number
  iconName: string
  iconStatus: ReturnType<typeof resolveToolVisualStatus>
  outcomeBadge: 'success' | 'error' | null
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
  const expanded = loading || awaitingUserInput || hasExpandableDetail

  return (
    <CcToolRow
      testId={`timeline-tool-${stepId}`}
      name={name}
      phaseActive={loading}
      outcomeBadge={outcomeBadge}
      branchLine={branchLine}
      inlineResult={inlineResult}
      mergeCount={mergeCount}
      iconName={iconName}
      iconStatus={iconStatus}
      branch={branch}
      expanded={expanded}
    >
      {showVerboseSummary ? (
        <CcToolNestedBranch>
          <p className={toolDetailClass(true)}>{toolErrorText}</p>
        </CcToolNestedBranch>
      ) : null}
      {showFailedDetail ? (
        <CcToolNestedBranch>
          <p className={toolDetailClass(true)}>{summary}</p>
        </CcToolNestedBranch>
      ) : null}
      {showBodySummary ? (
        <CcToolNestedBranch>
          <p className={toolDetailClass()}>{summary}</p>
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
