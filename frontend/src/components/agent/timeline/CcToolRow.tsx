import type { ReactNode } from 'react'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import { translateToolDisplayName, translateToolPhase } from '../../../utils/orchestrationI18n'
import { cn } from '@/lib/utils'
import {
  CC_BRANCH_CONTENT,
  CC_BRANCH_GLYPH,
  CC_TOOL_ARGS,
  CC_TOOL_HEADLINE,
  CC_TOOL_HEADLINE_BUTTON,
  CC_TOOL_HEADLINE_ROW,
  CC_TOOL_HEADLINE_STATIC,
  CC_TOOL_MAIN,
  CC_TOOL_MERGE,
  CC_TOOL_NAME,
  CC_TOOL_ROW_WRAP,
  CHEVRON_SLOT,
  HEADLINE_CLUSTER,
  TIMELINE_PENDING_IN,
  TOOL_DETAIL_TREE,
  ccHeadlineChevronClass,
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

  const headline = (
    <div className={CC_TOOL_HEADLINE}>
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
      {interactive ? (
        <span className={CHEVRON_SLOT} aria-hidden>
          <span className={ccHeadlineChevronClass(expanded)} />
        </span>
      ) : null}
    </div>
  )

  return (
    <div className={cn(CC_TOOL_ROW_WRAP, TIMELINE_PENDING_IN)} data-testid={testId}>
      <div className={CC_TOOL_HEADLINE_ROW}>
        {iconName ? (
          <div className={toolLeadCellClass()}>
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
        <div className={CC_TOOL_MAIN}>
          {interactive ? (
            <button
              type="button"
              className={CC_TOOL_HEADLINE_BUTTON}
              aria-expanded={expanded}
              onClick={onToggle}
              data-testid={testId ? `${testId}-toggle` : undefined}
            >
              {headline}
            </button>
          ) : (
            <div className={CC_TOOL_HEADLINE_STATIC}>{headline}</div>
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

/** 工具详情内二级树状行（嵌套在 ⎿ 分支内） */
export function CcToolNestedBranch({ children }: { children: ReactNode }) {
  if (!children) {
    return null
  }
  return (
    <div className={TOOL_DETAIL_TREE}>
      <span className={CC_BRANCH_GLYPH} aria-hidden />
      <div className={CC_BRANCH_CONTENT}>{children}</div>
    </div>
  )
}
