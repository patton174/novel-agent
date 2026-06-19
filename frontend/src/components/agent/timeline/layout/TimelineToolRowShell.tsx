import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  CC_TOOL_ROW_WRAP,
  TIMELINE_GRID_LEAD_CELL,
  TIMELINE_GRID_MAIN_CELL,
  TIMELINE_LEAD_GRID,
  TIMELINE_PENDING_IN,
  TOOL_HEADLINE_ROW,
  TOOL_MAIN,
} from '@/lib/timelineClasses'
import { TimelineBranchRow } from './TimelineBranchRow'

export interface TimelineToolRowShellProps {
  /** 有图标时用 grid，保证分支与工具名左对齐 */
  leadIcon?: ReactNode
  headline: ReactNode
  branch?: ReactNode
  className?: string
  testId?: string
  branchAnimateIn?: boolean
  branchTestId?: string
}

/**
 * 工具行外壳：带图标时走 grid；无图标时走 stack。
 * think_round 内工具须外包 OrchestrationFlatSlot(kind=tool)，勿在此组件内加 flat pl。
 */
export function TimelineToolRowShell({
  leadIcon,
  headline,
  branch,
  className,
  testId,
  branchAnimateIn = false,
  branchTestId,
}: TimelineToolRowShellProps) {
  if (leadIcon) {
    return (
      <div
        className={cn(CC_TOOL_ROW_WRAP, TIMELINE_PENDING_IN, TIMELINE_LEAD_GRID, className)}
        data-testid={testId}
        data-timeline-layout-tier="tool-root"
      >
        <div className={TIMELINE_GRID_LEAD_CELL} data-timeline-tool-lead>
          {leadIcon}
        </div>
        <div className={TIMELINE_GRID_MAIN_CELL}>{headline}</div>
        {branch ? (
          <TimelineBranchRow
            variant="tool-grid"
            animateIn={branchAnimateIn}
            testId={branchTestId ?? (testId ? `${testId}-branch` : undefined)}
          >
            {branch}
          </TimelineBranchRow>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(CC_TOOL_ROW_WRAP, TIMELINE_PENDING_IN, className)}
      data-testid={testId}
      data-timeline-layout-tier="tool-root"
    >
      <div className={TOOL_HEADLINE_ROW} data-timeline-tool-headline-row>
        <div className={TOOL_MAIN}>{headline}</div>
      </div>
      {branch ? (
        <TimelineBranchRow
          variant="tool-stack"
          animateIn={branchAnimateIn}
          testId={branchTestId ?? (testId ? `${testId}-branch` : undefined)}
        >
          {branch}
        </TimelineBranchRow>
      ) : null}
    </div>
  )
}
