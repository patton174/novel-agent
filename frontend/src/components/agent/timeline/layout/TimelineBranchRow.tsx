import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  CC_BRANCH_CONTENT,
  CC_BRANCH_GLYPH,
  TIMELINE_GRID_BRANCH_CELL,
  ccToolBranchClass,
} from '@/lib/timelineClasses'
import type { TimelineBranchVariant } from './types'

function branchShellClass(variant: TimelineBranchVariant): string {
  switch (variant) {
    case 'insight-in-round':
      return ccToolBranchClass({ hasLeadIcon: true })
    case 'insight-standalone':
      return ccToolBranchClass()
    case 'tool-grid':
      return TIMELINE_GRID_BRANCH_CELL
    case 'tool-stack':
      return ccToolBranchClass({ hasLeadIcon: false })
    case 'nested':
      return ccToolBranchClass({ nested: true })
    default:
      return ccToolBranchClass()
  }
}

export interface TimelineBranchRowProps {
  variant: TimelineBranchVariant
  children: ReactNode
  className?: string
  testId?: string
  animateIn?: boolean
}

/** 树状 └ + 结果正文；对齐规则由 variant 固定，避免业务层手写缩进 */
export function TimelineBranchRow({
  variant,
  children,
  className,
  testId,
  animateIn = false,
}: TimelineBranchRowProps) {
  return (
    <div
      className={cn(
        branchShellClass(variant),
        animateIn && 'agent-timeline-tool-body-in',
        className,
      )}
      data-testid={testId}
      data-timeline-branch-variant={variant}
    >
      <span className={CC_BRANCH_GLYPH} aria-hidden />
      <div className={CC_BRANCH_CONTENT}>{children}</div>
    </div>
  )
}
