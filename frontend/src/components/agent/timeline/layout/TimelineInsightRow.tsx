import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  CC_BRANCH_CONTENT,
  CC_TOOL_MAIN,
  CC_TOOL_ROW_WRAP,
  THINK_HEADLINE_ROW,
  thinkLeadCellClass,
} from '@/lib/timelineClasses'
import { TimelineBranchRow } from './TimelineBranchRow'

export interface TimelineInsightRowProps {
  /** 标题区（通常为可折叠按钮） */
  headline?: ReactNode
  /** 左侧图标（思考/推理） */
  leadIcon?: ReactNode
  /** 推理正文，渲染在树状分支行内 */
  body?: ReactNode
  /** think_round 内：仅影响 body 分支对齐，不改变 insight 外层缩进 */
  inThinkRound?: boolean
  onLeadRef?: (el: HTMLElement | null) => void
  leadId?: string
  /** 供 ThinkRailOverlay 测量竖线 */
  railRow?: boolean
  className?: string
  shellClassName?: string
  testId?: string
}

/**
 * 思考 / 推理专用行：与工具缩进体系分离。
 * 工具请使用 OrchestrationFlatSlot + TimelineToolRowShell。
 */
export function TimelineInsightRow({
  headline,
  leadIcon,
  body,
  inThinkRound = false,
  onLeadRef,
  leadId,
  railRow = false,
  className,
  shellClassName,
  testId,
}: TimelineInsightRowProps) {
  const showHeadline = Boolean(headline && leadIcon)

  return (
    <div
      className={cn('w-full', className)}
      data-testid={testId}
      data-timeline-layout-tier="insight"
      data-think-rail-row={railRow ? 'true' : undefined}
    >
      <div className={cn(CC_TOOL_ROW_WRAP, shellClassName)}>
        {showHeadline ? (
          <div className={THINK_HEADLINE_ROW}>
            <div
              className={thinkLeadCellClass()}
              data-timeline-lead
              data-think-lead-id={leadId}
              ref={onLeadRef}
            >
              {leadIcon}
            </div>
            <div className={CC_TOOL_MAIN}>{headline}</div>
          </div>
        ) : null}

        {body ? (
          inThinkRound ? (
            <div
              className={cn('pl-[calc(1.35rem+0.4rem)]', CC_BRANCH_CONTENT)}
              data-testid={testId ? `${testId}-body` : undefined}
            >
              {body}
            </div>
          ) : (
            <TimelineBranchRow
              variant="insight-standalone"
              testId={testId ? `${testId}-branch` : undefined}
            >
              {body}
            </TimelineBranchRow>
          )
        ) : null}
      </div>
    </div>
  )
}
