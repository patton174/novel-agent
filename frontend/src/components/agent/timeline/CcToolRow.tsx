import type { ReactNode } from 'react'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import { translateToolDisplayName, translateToolPhase } from '../../../utils/orchestrationI18n'
import { cn } from '@/lib/utils'
import {
  CC_BRANCH_CONTENT,
  CC_BRANCH_GLYPH,
  CC_TOOL_ARGS,
  CC_TOOL_HEADLINE_BUTTON,
  CC_TOOL_MERGE,
  CC_TOOL_NAME,
  CC_TOOL_ROW_WRAP,
  HEADLINE_CLUSTER,
  TIMELINE_PENDING_IN,
  TOOL_HEADLINE_ROW,
  TOOL_HEADLINE_STATIC,
  TOOL_MAIN,
  TOOL_TITLE_ROW,
  ccToolBranchClass,
  toolLeadCellClass,
} from '@/lib/timelineClasses'
import { resolveToolVisualStatus, TimelineLeadIcon, type ToolVisualStatus } from './TimelineLeadIcon'

export function CcToolRow({
  name,
  args,
  phase,
  phaseActive = false,
  resultHint,
  mergeCount,
  trailing,
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
  args?: string
  phase?: string
  phaseActive?: boolean
  resultHint?: string | null
  mergeCount?: number
  trailing?: ReactNode
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
  const showBody = expanded && (Boolean(branch) || Boolean(children))

  const displayName = translateToolDisplayName(name)
  const displayPhase = translateToolPhase(phase)

  const titleLine = (
    <div className={TOOL_TITLE_ROW} data-timeline-tool-title-row>
      <span className={HEADLINE_CLUSTER}>
        <span className={CC_TOOL_NAME}>{displayName}</span>
        {phase || args || resultHint ? (
          <span className={CC_TOOL_ARGS}>
            {displayPhase ? (
              <>
                {phaseActive ? (
                  <ShimmerScanText active>{displayPhase}</ShimmerScanText>
                ) : (
                  displayPhase
                )}
                {args || resultHint ? ' · ' : ''}
              </>
            ) : null}
            {args ? (
              <>
                {args}
                {resultHint ? ' · ' : ''}
              </>
            ) : null}
            {resultHint ? <span>{resultHint}</span> : null}
          </span>
        ) : null}
      </span>
      {mergeCount && mergeCount > 1 ? (
        <span className={CC_TOOL_MERGE}> ×{mergeCount}</span>
      ) : null}
      {trailing}
    </div>
  )

  return (
    <div className={cn(CC_TOOL_ROW_WRAP, TIMELINE_PENDING_IN)} data-testid={testId}>
      <div className={TOOL_HEADLINE_ROW} data-timeline-tool-headline-row>
        {iconName ? (
          <div className={toolLeadCellClass()} data-timeline-tool-lead>
            <TimelineLeadIcon
              iconName={iconName}
              status={
                iconStatus ??
                resolveToolVisualStatus({
                  loading: phaseActive,
                  error: phase === '失败',
                  success: phase === '已完成',
                })
              }
            />
          </div>
        ) : null}
        <div className={TOOL_MAIN}>
          {interactive ? (
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
          )}
        </div>
      </div>
      {showBody ? (
        <div
          className={ccToolBranchClass({ hasLeadIcon: Boolean(iconName) })}
          data-testid={testId ? `${testId}-branch` : undefined}
        >
          <span className={CC_BRANCH_GLYPH} aria-hidden />
          <div className={CC_BRANCH_CONTENT}>
            {branch}
            {children}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function CcToolBranchLine({ children }: { children: ReactNode }) {
  return (
    <div className={ccToolBranchClass({ nested: true })}>
      <span className={CC_BRANCH_GLYPH} aria-hidden />
      <div className={CC_BRANCH_CONTENT}>{children}</div>
    </div>
  )
}

export function CcToolNestedBranch({ children }: { children: ReactNode }) {
  if (!children) {
    return null
  }
  return <div className="mt-0.5 flex flex-col gap-1">{children}</div>
}
