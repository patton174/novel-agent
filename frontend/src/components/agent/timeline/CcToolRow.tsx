import type { ReactNode } from 'react'
import { ShimmerScanText } from '../../loaders/ShimmerScanText'
import {
  CcBranchContent,
  CcBranchGlyph,
  CcToolArgs,
  CcToolBranch,
  CcToolHeadline,
  CcToolHeadlineButton,
  CcToolHeadlineRow,
  CcToolHeadlineStatic,
  CcToolMain,
  CcToolMerge,
  CcToolName,
  CcToolRowWrap,
  HeadlineCluster,
  ToolDetailTree,
  ToolLeadCell,
} from './timelineStyles'
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
  const HeadlineWrap = interactive ? CcToolHeadlineButton : CcToolHeadlineStatic

  const headline = (
    <CcToolHeadline>
      <HeadlineCluster>
        <CcToolName>{name}</CcToolName>
        {phase || args || resultHint ? (
          <CcToolArgs>
            {phase ? (
              <>
                {phaseActive ? (
                  <ShimmerScanText active>{phase}</ShimmerScanText>
                ) : (
                  phase
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
          </CcToolArgs>
        ) : null}
      </HeadlineCluster>
      {mergeCount && mergeCount > 1 ? (
        <CcToolMerge> ×{mergeCount}</CcToolMerge>
      ) : null}
      {trailing}
    </CcToolHeadline>
  )

  return (
    <CcToolRowWrap data-testid={testId}>
      <CcToolHeadlineRow>
        {iconName ? (
          <ToolLeadCell>
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
          </ToolLeadCell>
        ) : null}
        <CcToolMain>
          {interactive ? (
            <HeadlineWrap
              type="button"
              aria-expanded={expanded}
              onClick={onToggle}
              data-testid={testId ? `${testId}-toggle` : undefined}
            >
              {headline}
            </HeadlineWrap>
          ) : (
            <HeadlineWrap>{headline}</HeadlineWrap>
          )}
        </CcToolMain>
      </CcToolHeadlineRow>
      {showBody ? (
        <CcToolBranch
          data-testid={testId ? `${testId}-branch` : undefined}
          $hasLeadIcon={Boolean(iconName)}
        >
          <CcBranchGlyph aria-hidden />
          <CcBranchContent>
            {branch}
            {children}
          </CcBranchContent>
        </CcToolBranch>
      ) : null}
    </CcToolRowWrap>
  )
}

export function CcToolBranchLine({ children }: { children: ReactNode }) {
  return (
    <CcToolBranch $nested>
      <CcBranchGlyph aria-hidden />
      <CcBranchContent>{children}</CcBranchContent>
    </CcToolBranch>
  )
}

/** 工具详情内二级树状行（嵌套在 ⎿ 分支内） */
export function CcToolNestedBranch({ children }: { children: ReactNode }) {
  if (!children) {
    return null
  }
  return (
    <ToolDetailTree>
      <CcBranchGlyph aria-hidden />
      <CcBranchContent>{children}</CcBranchContent>
    </ToolDetailTree>
  )
}
