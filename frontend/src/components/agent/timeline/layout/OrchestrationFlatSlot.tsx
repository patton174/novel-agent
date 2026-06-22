import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ORCHESTRATION_FLAT_ROW } from '@/lib/timelineClasses'
import type { OrchestrationFlatKind } from './types'

const FLAT_TEST_ID: Record<OrchestrationFlatKind, string> = {
  tool: 'timeline-orchestration-tool',
  text: 'timeline-orchestration-text',
}

export interface OrchestrationFlatSlotProps {
  kind: OrchestrationFlatKind
  children: ReactNode
  className?: string
  testId?: string
  flatAlign?: boolean
}

/**
 * think_round 内「平铺层」：工具 / 编排正文相对 insight 多缩进一级。
 * 仅包裹内容，不包含树状分支逻辑。
 */
export function OrchestrationFlatSlot({
  kind,
  children,
  className,
  testId,
  flatAlign = false,
}: OrchestrationFlatSlotProps) {
  return (
    <div
      className={cn(ORCHESTRATION_FLAT_ROW, flatAlign && 'pl-0', className)}
      data-testid={testId ?? FLAT_TEST_ID[kind]}
      data-timeline-layout-tier={kind === 'tool' ? 'flat-tool' : 'flat-text'}
    >
      {children}
    </div>
  )
}
