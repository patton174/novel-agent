import styled, { css, keyframes } from 'styled-components'
import { editorTheme } from '../../../styles/editorTheme'
import { palette } from '../../../styles/theme'
import { font } from '../../../styles/fonts'
import { textStyle } from '../../../styles/typography'
/** 思考/工具行左侧图标列宽 */
export const TIMELINE_LEAD_WIDTH = '1.35rem'

/** 与 uiSm 首行行高对齐 */
export const TIMELINE_BRANCH_LINE_EM = 1.35

/** 分支转角约占半行高，与首行文字垂直居中 */
export const TIMELINE_BRANCH_GLYPH_EM = 0.62

/** 思考正文、工具列表相对标题的缩进 */
export const TIMELINE_TREE_INDENT = '1.15rem'

/** 分支行左缘与标题文字（如「思考」）左对齐 */
export const TIMELINE_BRANCH_OFFSET = `calc(${TIMELINE_LEAD_WIDTH} + 0.4rem)`

/** 无左侧图标的工具行：详情分支相对标题略缩进 */
export const TIMELINE_TOOL_BRANCH_INDENT = '0.2rem'

export type ToolVisualStatus = 'loading' | 'success' | 'error' | 'idle'

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.05rem 0 0.2rem;
  max-width: 100%;
`

const TextBlockWrap = styled.div`
  width: 100%;
  max-width: 100%;
  padding: 0.32rem 0 0.48rem;
  margin: 0.18rem 0 0.28rem;

  [data-variant='chat'] {
    font-size: 0.9rem;
    line-height: 1.78;
    color: ${palette.textBody};

    p {
      color: ${palette.inkSoft};
    }

    strong {
      font-weight: 600;
      color: ${palette.text};
    }
  }
`

const TimelinePrimaryWrap = TextBlockWrap

/** 思考条：仅标题行占位，避免与正文同级的卡片体积 */
const ThinkTimelineWrap = styled.div`
  width: 100%;
  max-width: 100%;
  padding: 0.05rem 0 0.1rem;
`

/** CC-style planning / 编排层容器 */
const PlanningStackWrap = styled.div<{ $expanded: boolean; $active?: boolean; $flat?: boolean }>`
  display: flex;
  flex-direction: column;
  max-width: 100%;
  margin: 0;
  padding: 0;
  border-left: none;

  ${({ $flat, $active }) =>
    !$flat &&
    css`
      border-left: 2px solid ${$active ? palette.traceOk : editorTheme.border};
      padding-left: 0.35rem;
      margin-left: 0.1rem;
    `}
`

const PlanningHeader = styled.button`
  display: block;
  width: 100%;
  min-height: ${TIMELINE_LEAD_WIDTH};
  padding: 0.12rem 0.25rem 0.12rem 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;

  &:hover .planning-title {
    color: ${editorTheme.text};
  }

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px ${palette.accentBorderLight};
    border-radius: 4px;
  }
`

const PlanningHeaderMain = styled.div`
  flex: 1;
  min-width: 0;
  padding-top: 0.02rem;
`

const PlanningTitle = styled.span.attrs({ className: 'planning-title' })`
  ${textStyle('uiSm')}
  font-weight: 600;
  color: ${editorTheme.textSecondary};
`

const PlanningChevron = styled.span<{ $open: boolean }>`
  flex-shrink: 0;
  width: 0.42rem;
  height: 0.42rem;
  border-right: 1.5px solid ${editorTheme.textMuted};
  border-bottom: 1.5px solid ${editorTheme.textMuted};
  transform: rotate(${({ $open }) => ($open ? '-135deg' : '45deg')});
  transition: transform ${editorTheme.transition};
`

const PlanningInsightWrap = styled.div`
  width: 100%;
`

const PlanningStackBody = styled.div<{ $indented?: boolean; $branchIndent?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  padding: 0.15rem 0 0.3rem;

  ${({ $indented }) =>
    $indented &&
    css`
      padding-left: 0;
    `}

  /** 思考 / 工具 / 编排正文相对「编排」标题行缩进 */
  ${({ $branchIndent }) =>
    $branchIndent &&
    css`
      padding-left: ${TIMELINE_TREE_INDENT};
    `}
`

const PlanningNestedHint = styled.div`
  ${textStyle('uiSm')}
  color: ${editorTheme.textMuted};
`

/** 编排内行动说明：与工具标题左缘对齐（图标列 + 间距） */
const OrchestrationNarration = styled.div`
  flex: 1;
  min-width: 0;
  ${textStyle('bodySm')}
  color: ${editorTheme.text};
  padding: 0.02rem 0 0.1rem;
`

/** 编排正文行：与 CcToolRow 标题行同宽同缩进 */
const OrchestrationBodyRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.4rem;
  width: 100%;
  max-width: 100%;
  padding: 0.05rem 0 0.1rem;
`

/**
 * 编排内正文/工具：相对思考图标列右缩进，不占用左侧竖线轴。
 * 思考 💡 在竖线轴上；正文与工具名从此处起排。
 */
const OrchestrationFlatRow = styled.div`
  width: 100%;
  max-width: 100%;
  padding: 0.05rem 0 0.1rem;
  padding-left: ${TIMELINE_BRANCH_OFFSET};
  box-sizing: border-box;
`

/** 编排内思考正文：与 OrchestrationFlatRow 左缘对齐 */
const ThinkBodyInRound = styled.div`
  width: 100%;
  max-width: 100%;
  padding: 0.05rem 0 0.12rem;
  padding-left: ${TIMELINE_BRANCH_OFFSET};
  box-sizing: border-box;
`

/* ── Claude Code tool row (⏺ name (args) + ⎿ branch) ── */

const CcToolRowWrap = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  padding: 0.1rem 0;
`

/** 工具名行：图标与标题垂直居中，与编排/询问等 headline 共用 */
const CcToolHeadlineRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  min-width: 0;
`

const PlanningHeadlineRow = CcToolHeadlineRow

/** 单行左侧图标列（与嵌套工具、思考行共用宽度） */
const ToolLeadCell = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex: 0 0 ${TIMELINE_LEAD_WIDTH};
  width: ${TIMELINE_LEAD_WIDTH};
  min-height: ${TIMELINE_LEAD_WIDTH};
  align-items: center;
  justify-content: center;
`

function leadIconColor(status: ToolVisualStatus | undefined): string {
  switch (status) {
    case 'loading':
      return editorTheme.textMuted
    case 'success':
      return palette.traceOk
    case 'error':
      return palette.errorBright
    case 'idle':
    default:
      return palette.textFaint
  }
}

const ToolIconSlot = styled.span<{ $status?: ToolVisualStatus }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${TIMELINE_LEAD_WIDTH};
  height: ${TIMELINE_LEAD_WIDTH};
  color: ${({ $status }) => leadIconColor($status)};
  flex-shrink: 0;
`

const ThinkRoundWrap = styled.div<{ $hasRail?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  width: 100%;
  max-width: 100%;
  margin: 0.04rem 0 0.12rem;

  ${({ $hasRail }) =>
    $hasRail &&
    css`
      &::before {
        content: '';
        position: absolute;
        left: calc(${TIMELINE_LEAD_WIDTH} / 2 - 1px);
        top: calc(${TIMELINE_LEAD_WIDTH} + 0.08rem);
        bottom: 0.06rem;
        width: 2px;
        background: ${editorTheme.border};
        pointer-events: none;
        border-radius: 1px;
      }
    `}
`

/** 思考块之间的竖线由 ThinkRoundWrap::$hasRail 绘制；工具/正文不再额外缩进 */
const ThinkRoundTools = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.06rem;
  margin-top: 0.02rem;
`

/** 子代理模态等：思考/工具组左侧灰线；正文区块不包裹，遇正文自然断开 */
const TimelineMetaRail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.06rem;
  width: 100%;
  max-width: 100%;
  margin: 0.04rem 0 0.1rem;
  padding-left: 0.72rem;
  border-left: 1.5px solid ${palette.borderStrong};
  box-sizing: border-box;
`

const CcToolMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
  padding-left: 0;
`

const CcToolHeadline = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.2rem 0.35rem;
  min-width: 0;
  width: 100%;
  min-height: ${TIMELINE_LEAD_WIDTH};
  ${textStyle('uiSm')}
  line-height: 1.35;
`

const HeadlineCluster = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem 0.35rem;
  min-width: 0;
  flex: 1 1 auto;
`

const ChevronSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 1.1rem;
  width: 1.1rem;
  height: ${TIMELINE_LEAD_WIDTH};
  margin-left: auto;
`

const CcHeadlineChevron = styled.span<{ $open: boolean }>`
  display: block;
  width: 0.42rem;
  height: 0.42rem;
  border-right: 1.5px solid ${editorTheme.textMuted};
  border-bottom: 1.5px solid ${editorTheme.textMuted};
  transform: rotate(${({ $open }) => ($open ? '-135deg' : '45deg')});
  transition: transform ${editorTheme.transition};
`

/** 半行高 CSS 转角，替代全高 ⎿ 字符以免偏低 */
const CcBranchGlyph = styled.span`
  flex: 0 0 0.55rem;
  width: 0.55rem;
  height: ${TIMELINE_BRANCH_GLYPH_EM}em;
  margin-top: 0.2em;
  position: relative;
  align-self: flex-start;
  user-select: none;

  &::before {
    content: '';
    position: absolute;
    left: 0.1em;
    bottom: 0.04em;
    width: 0.36em;
    height: 0.36em;
    border-left: 1.5px solid ${palette.textMuted};
    border-bottom: 1.5px solid ${palette.textMuted};
    border-bottom-left-radius: 1px;
  }
`

const CcToolName = styled.span`
  font-weight: 600;
  color: ${editorTheme.textSecondary};
`

const CcToolHeadlineButton = styled.button`
  display: block;
  width: 100%;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;

  &:hover ${CcToolName} {
    color: ${editorTheme.text};
  }

  &:focus-visible {
    outline: none;
    border-radius: 6px;
    box-shadow: 0 0 0 2px ${palette.accentBorderLight};
  }

  &:disabled {
    cursor: default;
  }
`

const CcToolHeadlineStatic = styled.div`
  width: 100%;
  min-width: 0;
`

const OrchestrationPendingLabel = styled.div`
  min-height: ${TIMELINE_LEAD_WIDTH};
  display: flex;
  align-items: center;
  ${textStyle('uiSm')}
  font-weight: 600;
  line-height: 1.35;
  color: ${editorTheme.textSecondary};
`

const CcToolArgs = styled.span`
  font-weight: 400;
  color: ${editorTheme.textMuted};
  font-size: 0.78rem;
`

const CcToolMerge = styled.span`
  font-weight: 500;
  color: ${editorTheme.textMuted};
`

const CcToolBranch = styled.div<{ $nested?: boolean; $hasLeadIcon?: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.3rem;
  max-width: 100%;
  padding-top: 0.05rem;
  padding-left: ${({ $nested, $hasLeadIcon }) =>
    $nested
      ? '0'
      : $hasLeadIcon === false
        ? '0'
        : TIMELINE_BRANCH_OFFSET};
`

const CcBranchContent = styled.div`
  flex: 1;
  min-width: 0;
  ${textStyle('uiSm')}
  line-height: ${TIMELINE_BRANCH_LINE_EM};
  color: ${editorTheme.textMuted};
  word-break: break-word;
`

const CcToolBranchInRound = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.35rem;
  width: 100%;
  max-width: 100%;
  margin-top: 0.2rem;
  padding-left: ${TIMELINE_BRANCH_OFFSET};
`

const ThinkTreeGlyphCell = styled(CcBranchGlyph)``

const CcProgressHint = styled.span`
  ${textStyle('micro')}
  color: ${editorTheme.textMuted};
  margin-left: auto;
`

const FailTag = styled.span`
  ${textStyle('micro')}
  font-weight: 600;
  color: ${palette.errorBright};
`

const ToolDetail = styled.p<{ $error?: boolean }>`
  width: 100%;
  margin: 0;
  padding-left: 0;
  ${textStyle('uiSm')}
  color: ${({ $error }) => ($error ? editorTheme.error : editorTheme.textMuted)};
`

const ToolDetailTree = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.3rem;
  width: 100%;
  max-width: 100%;
  margin-top: 0.12rem;
  padding-left: 0;
`

const ToolDetailPanel = styled.div`
  width: 100%;
  margin-top: 0.2rem;
  padding-left: 0.15rem;
`

const ToolDetailToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.1rem 0.2rem;
  margin: 0;
  border: none;
  border-radius: ${editorTheme.radiusSm};
  background: transparent;
  cursor: pointer;
  ${textStyle('micro')}
  color: ${editorTheme.textMuted};

  &:hover {
    color: ${editorTheme.textSecondary};
    background: ${editorTheme.bgHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px ${palette.accentBorderLight};
  }
`

const ToolDetailChevron = styled.span<{ $open: boolean }>`
  flex-shrink: 0;
  width: 0.38rem;
  height: 0.38rem;
  border-right: 1.5px solid ${editorTheme.textMuted};
  border-bottom: 1.5px solid ${editorTheme.textMuted};
  transform: rotate(${({ $open }) => ($open ? '-135deg' : '45deg')});
  transition: transform ${editorTheme.transition};
`

const ToolDetailSection = styled.div`
  margin-top: 0.35rem;
  max-width: 100%;
`

const ToolDetailSectionLabel = styled.div`
  ${textStyle('micro')}
  font-weight: 600;
  color: ${editorTheme.textMuted};
  margin-bottom: 0.2rem;
`

const ToolDetailPre = styled.pre<{ $error?: boolean }>`
  margin: 0;
  padding: 0.4rem 0.45rem;
  max-height: 16rem;
  overflow: auto;
  border-radius: ${editorTheme.radiusSm};
  border: 1px solid ${editorTheme.border};
  background: ${editorTheme.bg};
  ${textStyle('micro')}
  font-family: ${font.mono};
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${({ $error }) => ($error ? editorTheme.error : editorTheme.textSecondary)};
`

const SelectedChoiceRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  padding: 0.2rem 0 0.28rem;
  margin: 0;
  border: none;
  background: transparent;
`

const SelectedBadge = styled.span`
  ${textStyle('micro')}
  font-weight: 600;
  color: ${editorTheme.textMuted};
`

const SelectedTitle = styled.span`
  ${textStyle('uiSm')}
  font-weight: 600;
  color: ${editorTheme.text};
  line-height: 1.45;
`

const SelectedDesc = styled.span`
  ${textStyle('micro')}
  color: ${editorTheme.textMuted};
  line-height: 1.4;
`

const ChoiceList = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  margin-top: 0.1rem;
  padding: 0;
`

const CcChoiceButton = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.12rem;
  width: 100%;
  padding: 0.4rem 0.5rem;
  margin: 0;
  text-align: left;
  border: none;
  border-radius: ${editorTheme.radiusSm};
  background: ${({ $active }) => ($active ? editorTheme.accentSoft : 'transparent')};
  color: ${editorTheme.text};
  cursor: pointer;
  transition: background ${editorTheme.transition};

  &:hover:not(:disabled) {
    background: ${editorTheme.bgHover};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px ${palette.accentBorderLight};
  }

  @media (max-width: 767px) {
    padding: 0.32rem 0.45rem;
    gap: 0.08rem;
  }
`

const StepPrompt = styled.div`
  ${textStyle('uiSm')}
  color: ${editorTheme.textSecondary};
  margin: 0 0 0.1rem;
  line-height: 1.45;
`

const choiceReveal = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const ChoiceReveal = styled.div<{ $delayMs?: number }>`
  animation: ${choiceReveal} 0.28s ease ${({ $delayMs = 0 }) => $delayMs}ms both;
`

const MultiSelectActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

const MultiSelectHint = styled.span`
  ${textStyle('micro')}
  color: ${palette.textSubtle};
`

const CustomInputRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.15rem;
`

const CustomHint = styled.span`
  ${textStyle('micro')}
  color: ${palette.textMuted};
`

const CustomInput = styled.input`
  width: 100%;
  padding: 0.42rem 0.5rem;
  border: 1px solid ${editorTheme.border};
  border-radius: ${editorTheme.radiusSm};
  background: ${editorTheme.bgElevated};
  color: ${editorTheme.text};
  ${textStyle('uiSm')}

  &::placeholder {
    color: ${editorTheme.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${palette.accentBorder};
  }
`

const ChoiceTitle = styled.div`
  ${textStyle('uiSm')}
  font-weight: 600;
  color: ${editorTheme.text};
`

const ChoiceDesc = styled.div`
  ${textStyle('micro')}
  color: ${editorTheme.textMuted};
  line-height: 1.4;
`

/** 子 Agent 嵌套卡片（挂在 Agent 工具分支下） */
const SubagentPanelCard = styled.div<{ $active?: boolean }>`
  margin-top: 0.15rem;
  padding: 0.5rem 0.55rem 0.55rem;
  border-radius: ${editorTheme.radiusMd};
  border: 1px solid
    ${({ $active }) => ($active ? palette.accentBorderLight : editorTheme.border)};
  background: ${editorTheme.bgElevated};
  box-shadow: ${({ $active }) =>
    $active ? `0 0 0 1px ${palette.accentBorderLight}` : 'none'};
`

const SubagentStatusChip = styled.span<{ $kind: ToolVisualStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.12rem 0.45rem;
  border-radius: ${editorTheme.radiusSm};
  ${textStyle('micro')}
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.3;
  border: 1px solid
    ${({ $kind }) =>
      $kind === 'loading'
        ? editorTheme.border
        : $kind === 'error'
          ? 'rgba(196,92,92,0.35)'
          : 'rgba(39,174,96,0.35)'};
  background: ${({ $kind }) =>
    $kind === 'loading'
      ? editorTheme.bgHover
      : $kind === 'error'
        ? 'rgba(196,92,92,0.1)'
        : 'rgba(39,174,96,0.08)'};
  color: ${({ $kind }) =>
    $kind === 'loading'
      ? editorTheme.textSecondary
      : $kind === 'error'
        ? palette.errorBright
        : palette.successBright};
`

const SubagentSummaryBox = styled.div`
  margin-top: 0.35rem;
  padding: 0.05rem 0 0.1rem;
  ${textStyle('uiSm')}
  color: ${editorTheme.text};
`

/** 编排区与正文区之间的全宽分隔线 */
const TimelineBodyDivider = styled.div`
  width: 100%;
  height: 0;
  margin: 0.42rem 0 0.36rem;
  border: none;
  border-top: 1px solid ${editorTheme.border};
`

/** 交付正文内容区（无图标，左缘与编排层同级） */
const DeliveryBodyWrap = styled.div`
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  padding: 0.02rem 0 0.15rem;

  [data-variant='chat'] {
    font-size: 0.9rem;
    line-height: 1.78;
    color: ${palette.textBody};

    p:first-child {
      margin-top: 0;
    }

    p {
      color: ${palette.inkSoft};
    }

    strong {
      font-weight: 600;
      color: ${palette.text};
    }
  }
`

const ToolRow = CcToolRowWrap
const ToolHead = CcToolHeadline
const ToolTitle = CcToolName
const ToolTitleText = CcToolName
const ToolMergeHint = CcToolMerge
const MemoryReadLabels = CcBranchContent
const DoneTag = FailTag
const ProgressTag = CcProgressHint

export {
  Column,
  TimelinePrimaryWrap,
  ThinkTimelineWrap,
  TextBlockWrap,
  PlanningStackWrap,
  PlanningHeader,
  PlanningHeaderMain,
  PlanningTitle,
  PlanningChevron,
  PlanningInsightWrap,
  PlanningStackBody,
  PlanningNestedHint,
  OrchestrationNarration,
  OrchestrationBodyRow,
  OrchestrationFlatRow,
  ThinkBodyInRound,
  SelectedChoiceRow,
  SelectedBadge,
  SelectedTitle,
  SelectedDesc,
  CcToolRowWrap,
  CcToolHeadlineRow,
  PlanningHeadlineRow,
  ToolLeadCell,
  ToolIconSlot,
  ThinkRoundWrap,
  ThinkRoundTools,
  TimelineMetaRail,
  CcToolMain,
  CcToolHeadline,
  CcToolHeadlineButton,
  CcToolHeadlineStatic,
  HeadlineCluster,
  ChevronSlot,
  CcHeadlineChevron,
  CcToolBranchInRound,
  ThinkTreeGlyphCell,
  CcToolName,
  OrchestrationPendingLabel,
  CcToolArgs,
  CcToolMerge,
  CcToolBranch,
  CcBranchGlyph,
  CcBranchContent,
  CcProgressHint,
  ToolRow,
  ToolHead,
  ToolTitle,
  ToolTitleText,
  ToolMergeHint,
  MemoryReadLabels,
  FailTag,
  DoneTag,
  ProgressTag,
  ToolDetail,
  ToolDetailTree,
  ToolDetailPanel,
  ToolDetailToggle,
  ToolDetailChevron,
  ToolDetailSection,
  ToolDetailSectionLabel,
  ToolDetailPre,
  ChoiceList,
  CcChoiceButton,
  StepPrompt,
  ChoiceReveal,
  MultiSelectActions,
  MultiSelectHint,
  CustomInputRow,
  CustomHint,
  CustomInput,
  ChoiceTitle,
  ChoiceDesc,
  SubagentPanelCard,
  SubagentStatusChip,
  SubagentSummaryBox,
  TimelineBodyDivider,
  DeliveryBodyWrap,
}
