import type { ReactNode } from 'react'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import { translateToolDisplayName, translateToolOutcome } from '../../../utils/orchestrationI18n'
import {
  CC_TOOL_ARGS,
  CC_TOOL_HEADLINE_BUTTON,
  CC_TOOL_MERGE,
  CC_TOOL_NAME,
  TOOL_HEADLINE_STATIC,
  TOOL_TITLE_ROW,
  TOOL_OUTCOME_ERROR,
  TOOL_OUTCOME_SUCCESS,
} from '@/lib/timelineClasses'
import { TimelineBranchRow, TimelineToolRowShell } from './layout'
import { resolveToolVisualStatus, TimelineLeadIcon, type ToolVisualStatus } from './TimelineLeadIcon'

export function CcToolRow({
  name,
  phaseActive = false,
  outcomeBadge,
  branchLine,
  mergeCount,
  branch,
  children,
  testId,
  collapsible = false,
  expanded = true,
  onToggle,
  iconName,
  iconStatus,
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
}) {
  const interactive = collapsible && Boolean(onToggle)
  const displayName = translateToolDisplayName(name)
  const showBranchArea = Boolean(branchLine?.trim() || branch || children)
  const showOptionalDetail = Boolean(expanded && (branch || children))

  const titleLine = (
    <div className={TOOL_TITLE_ROW} data-timeline-tool-title-row>
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
      {!phaseActive && outcomeBadge ? (
        <span className={CC_TOOL_ARGS} data-testid={testId ? `${testId}-outcome` : undefined}>
          {' · '}
          <span
            className={
              outcomeBadge === 'success' ? TOOL_OUTCOME_SUCCESS : TOOL_OUTCOME_ERROR
            }
          >
            {translateToolOutcome(outcomeBadge)}
          </span>
        </span>
      ) : null}
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
  ) : (
    <div className={TOOL_HEADLINE_STATIC}>{titleLine}</div>
  )

  const branchBody = showBranchArea ? (
    <>
      {branchLine?.trim() ? <div>{branchLine}</div> : null}
      {showOptionalDetail ? (
        <>
          {branch}
          {children}
        </>
      ) : null}
    </>
  ) : null

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
