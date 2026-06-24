import type { ReactNode } from 'react'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import { translateToolDisplayName, translateToolOutcome } from '../../../utils/orchestrationI18n'
import { EDITOR_PIXEL_TOOL_ROW } from '@/lib/editorPixelClasses'
import {
  CC_TOOL_HEADLINE_BUTTON,
  CC_TOOL_MERGE,
  CC_TOOL_NAME,
  ORCH_STEP_META,
  TOOL_HEADLINE_STATIC,
  TOOL_OUTCOME_ERROR,
  TOOL_OUTCOME_SUCCESS,
  TOOL_TITLE_ROW,
} from '@/lib/timelineClasses'
import { TimelineBranchRow, TimelineToolRowShell } from './layout'
import { resolveToolVisualStatus, TimelineLeadIcon, type ToolVisualStatus } from './TimelineLeadIcon'

export function CcToolRow({
  name,
  phaseActive = false,
  outcomeBadge,
  branchLine: _branchLine,
  mergeCount,
  branch,
  children,
  testId,
  collapsible = false,
  expanded = true,
  onToggle,
  iconName,
  iconStatus,
  inlineResult,
  headlineOnClick,
}: {
  name: string
  phaseActive?: boolean
  outcomeBadge?: 'success' | 'error' | null
  branchLine?: string | null
  mergeCount?: number
  branch?: ReactNode
  children?: ReactNode
  testId?: string
  collapsible?: boolean
  expanded?: boolean
  onToggle?: () => void
  iconName?: string
  iconStatus?: ToolVisualStatus
  /** 标题行内联结果（产出摘要），与工具名、状态同一行展示 */
  inlineResult?: string | null
  /** 点击标题（非折叠模式） */
  headlineOnClick?: () => void
}) {
  const interactive = collapsible && Boolean(onToggle)
  const displayName = translateToolDisplayName(name)
  const trimmedInline = inlineResult?.trim() || ''
  const hasDetailBranch = Boolean(branch || children)
  const showOptionalDetail = Boolean(expanded && hasDetailBranch)
  const showBranchArea = showOptionalDetail

  const metaLine = phaseActive ? null : outcomeBadge ? (
    <span className={ORCH_STEP_META} data-testid={testId ? `${testId}-meta` : undefined}>
      {' · '}
      <span
        className={
          outcomeBadge === 'success' ? TOOL_OUTCOME_SUCCESS : TOOL_OUTCOME_ERROR
        }
      >
        {translateToolOutcome(outcomeBadge)}
      </span>
      {trimmedInline ? <> · {trimmedInline}</> : null}
    </span>
  ) : trimmedInline ? (
    <span className={ORCH_STEP_META} data-testid={testId ? `${testId}-meta` : undefined}>
      {' · '}
      {trimmedInline}
    </span>
  ) : null

  const titleLine = (
    <div className={showBranchArea ? TOOL_TITLE_ROW : EDITOR_PIXEL_TOOL_ROW} data-timeline-tool-title-row>
      <span className={CC_TOOL_NAME}>
        {phaseActive ? (
          <ShimmerScanText active>{displayName}</ShimmerScanText>
        ) : (
          displayName
        )}
      </span>
      {mergeCount && mergeCount > 1 ? (
        <span className={CC_TOOL_MERGE}> ×{mergeCount}</span>
      ) : null}
      {metaLine}
    </div>
  )

  const headline = interactive ? (
    <button
      type="button"
      className={CC_TOOL_HEADLINE_BUTTON}
      aria-expanded={expanded}
      onClick={onToggle}
      data-testid={testId ? `${testId}-toggle` : undefined}
    >
      {titleLine}
    </button>
  ) : headlineOnClick ? (
    <button
      type="button"
      className={CC_TOOL_HEADLINE_BUTTON}
      onClick={headlineOnClick}
      data-testid={testId ? `${testId}-headline` : undefined}
    >
      {titleLine}
    </button>
  ) : (
    <div className={TOOL_HEADLINE_STATIC}>{titleLine}</div>
  )

  const branchBody = showBranchArea ? (
    <>
      {branch}
      {children}
    </>
  ) : undefined

  const leadIcon = iconName ? (
    <TimelineLeadIcon
      iconName={iconName}
      status={
        iconStatus ??
        resolveToolVisualStatus({
          loading: phaseActive,
          error: outcomeBadge === 'error',
          success: outcomeBadge === 'success',
        })
      }
    />
  ) : undefined

  return (
    <TimelineToolRowShell
      testId={testId}
      leadIcon={leadIcon}
      headline={headline}
      branch={branchBody}
      branchAnimateIn={showOptionalDetail}
      branchTestId={testId ? `${testId}-branch` : undefined}
    />
  )
}

export function CcToolBranchLine({ children }: { children: ReactNode }) {
  return <TimelineBranchRow variant="nested">{children}</TimelineBranchRow>
}

export function CcToolNestedBranch({ children }: { children: ReactNode }) {
  if (!children) {
    return null
  }
  return <div className="mt-0.5 flex flex-col gap-1">{children}</div>
}
