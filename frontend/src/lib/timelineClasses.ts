import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import {
  EDITOR_PIXEL_INPUT,
  EDITOR_PIXEL_ORCH_HEADLINE,
  EDITOR_PIXEL_ORCH_STEP_META,
  EDITOR_PIXEL_ORCH_THINK_BODY,
  EDITOR_PIXEL_ORCH_TIMELINE,
  EDITOR_PIXEL_TIMELINE_NARRATION,
  EDITOR_PIXEL_TIMELINE_TITLE,
  EDITOR_PIXEL_TOOL_NAME,
  EDITOR_PIXEL_TOOL_ROW,
  editorPixelChoiceButtonClass,
  editorPixelStatusIconClass,
  editorPixelSubagentWrapClass,
  editorPixelThinkBlockClass,
} from '@/lib/editorPixelClasses'

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

/** 图标列 + 标题列网格：分支行与标题左缘对齐 */
export const TIMELINE_LEAD_GRID = cn(
  'grid w-full max-w-full grid-cols-[1.35rem_minmax(0,1fr)] gap-x-2 items-start overflow-visible',
)

export const TIMELINE_GRID_LEAD_CELL =
  'col-start-1 row-start-1 flex h-[1.35rem] w-[1.35rem] items-center justify-center self-center overflow-visible'

export const TIMELINE_GRID_MAIN_CELL = 'col-start-2 row-start-1 min-w-0'

export const TIMELINE_GRID_BRANCH_CELL = cn(
  'col-start-2 row-start-2 flex min-w-0 flex-row items-start gap-[0.3rem] pt-[0.05rem]',
)

/** 无左侧图标的工具行：详情分支相对标题略缩进 */
export const TIMELINE_TOOL_BRANCH_INDENT = '0.2rem'

export type ToolVisualStatus = 'loading' | 'success' | 'error' | 'idle'

export const TIMELINE_COLUMN = EDITOR_PIXEL_ORCH_TIMELINE

export const TIMELINE_SLOT =
  'flex min-h-6 flex-col gap-2 max-md:min-h-5 max-md:gap-1.5'

export const TIMELINE_TEXT_BLOCK =
  'agent-timeline-text-block mx-0 my-[0.18rem] w-full max-w-full px-0 py-[0.32rem] pb-[0.48rem]'

export const TIMELINE_PRIMARY_WRAP = TIMELINE_TEXT_BLOCK

export const TIMELINE_THINK_WRAP =
  'w-full max-w-full px-0 py-[0.05rem] pb-[0.1rem] pt-[0.05rem]'

export function planningStackWrapClass(opts: {
  expanded?: boolean
  active?: boolean
  flat?: boolean
}) {
  return cn(
    editorPixelThinkBlockClass(Boolean(opts.expanded || opts.active)),
    'm-0 flex max-w-full flex-col',
    opts.flat && 'overflow-visible',
  )
}

export const ORCHESTRATION_HEADER_ROW =
  'relative min-h-[1.35rem] w-full min-w-0'

/** 助手流容器：与营销 demo 同宽，无左侧树状 gutter */
export const TIMELINE_ICON_GUTTER =
  'relative box-border w-full max-w-full overflow-visible'

export const PLANNING_HEADER = cn(
  'group block min-h-[1.35rem] w-full cursor-pointer border-none bg-transparent px-2 py-1 text-left',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
)

export const PLANNING_HEADER_MAIN = 'flex min-h-[1.35rem] min-w-0 flex-1 items-center pt-0'

export const PLANNING_TITLE = cn(
  EDITOR_PIXEL_TIMELINE_TITLE,
  'planning-title max-md:text-[0.74rem]',
)

export const ORCH_HEADLINE = EDITOR_PIXEL_ORCH_HEADLINE

export const ORCH_STEP_META = EDITOR_PIXEL_ORCH_STEP_META

export function planningChevronClass(open?: boolean) {
  return cn(
    'size-[0.42rem] shrink-0 border-b-[1.5px] border-r-[1.5px] border-muted-foreground/50 transition-transform duration-[0.25s] ease-in-out',
    open ? '-rotate-[135deg]' : 'rotate-45',
  )
}

export const PLANNING_INSIGHT_WRAP = 'w-full'

export function planningStackBodyClass(opts?: {
  indented?: boolean
  branchIndent?: boolean
}) {
  return cn(
    'flex flex-col gap-2 px-2 py-1 pb-2',
    opts?.indented && 'pl-2',
    opts?.branchIndent && 'pl-2',
  )
}

export const PLANNING_NESTED_HINT = cn(EDITOR_PIXEL_ORCH_THINK_BODY, 'text-muted-foreground')

export const ORCHESTRATION_NARRATION = EDITOR_PIXEL_TIMELINE_NARRATION

export const ORCHESTRATION_BODY_ROW =
  'flex w-full max-w-full flex-row items-start gap-[0.4rem] px-0 py-[0.05rem] pb-[0.1rem]'

export const ORCHESTRATION_FLAT_ROW = cn(
  'box-border w-full max-w-full overflow-visible px-0 py-[0.2rem]',
)

export const ORCHESTRATION_SUMMARY_REVEAL = 'agent-timeline-orchestration-summary-reveal'

export const THINK_BODY_IN_ROUND = ORCHESTRATION_FLAT_ROW

export const CC_TOOL_ROW_WRAP = 'w-full max-w-full overflow-visible px-0 py-0'

/** 思考头行（已验收对齐，勿与工具共用） */
export const THINK_HEADLINE_ROW =
  'flex w-full min-w-0 flex-row items-center gap-2'

/** 工具头行：图标与工具名首行顶对齐（勿 items-center 整行） */
export const TOOL_HEADLINE_ROW =
  'flex w-full min-w-0 flex-row items-start gap-2'

export const TOOL_TITLE_ROW = cn(
  'flex min-h-[1.35rem] w-full min-w-0 flex-nowrap items-center gap-x-2 gap-y-0',
  'text-[0.74rem] leading-[1.35rem]',
  'max-md:text-[0.7rem] max-md:leading-snug',
)

export const CC_TOOL_HEADLINE_ROW = THINK_HEADLINE_ROW

export const PLANNING_HEADLINE_ROW = THINK_HEADLINE_ROW

export function thinkLeadCellClass(_compact?: boolean) {
  return cn(
    'agent-timeline-lead-cell relative z-[1] flex size-5 flex-[0_0_1.25rem] shrink-0 items-center justify-center',
  )
}

export function toolLeadCellClass(_compact?: boolean) {
  return cn(
    'agent-timeline-lead-cell relative z-[1] flex h-[1.35rem] w-[1.35rem] flex-[0_0_1.35rem] shrink-0 items-center justify-center',
  )
}

export function toolIconSlotClass(status?: ToolVisualStatus) {
  return cn(
    'inline-flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center leading-none',
    status === 'loading' && 'text-muted-foreground',
    status === 'success' && 'text-foreground',
    status === 'error' && 'text-destructive',
    (!status || status === 'idle') && 'text-muted-foreground/50',
  )
}

export function thinkRoundWrapClass(hasThinkRail?: boolean) {
  return cn(
    'relative mx-0 my-[0.06rem] mb-[0.2rem] flex w-full max-w-full flex-col gap-2',
    hasThinkRail && 'agent-timeline-think-tree',
  )
}

export const THINK_ROUND_TOOLS =
  'mt-[0.06rem] flex flex-col gap-2'

export const TIMELINE_META_RAIL = cn(
  'mx-0 my-[0.04rem] mb-[0.1rem] box-border flex w-full max-w-full flex-col gap-[0.06rem] border-l-2 border-foreground/40 pl-[0.72rem]',
)

export const CC_TOOL_MAIN =
  'flex min-h-[1.35rem] min-w-0 flex-1 flex-col justify-center gap-[0.08rem] pl-0'

export const TOOL_MAIN =
  'flex min-w-0 flex-1 flex-col justify-start gap-[0.04rem] pl-0'

export const TOOL_HEADLINE = TOOL_TITLE_ROW

export const HEADLINE_CLUSTER =
  'inline-flex min-w-0 flex-[1_1_auto] flex-wrap items-center gap-x-[0.35rem] gap-y-[0.2rem]'

export const CHEVRON_SLOT =
  'ml-auto inline-flex h-[1.35rem] w-[1.1rem] flex-[0_0_1.1rem] items-center justify-center'

export function ccHeadlineChevronClass(open?: boolean) {
  return cn(
    'block size-[0.42rem] border-b-[1.5px] border-r-[1.5px] border-[#64748b] transition-transform duration-[0.25s] ease-in-out',
    open ? '-rotate-[135deg]' : 'rotate-45',
  )
}

export const CC_BRANCH_GLYPH = 'agent-timeline-branch-glyph'

export const CC_TOOL_NAME = EDITOR_PIXEL_TOOL_NAME

export const CC_TOOL_HEADLINE_BUTTON = cn(
  'group m-0 flex w-full cursor-pointer items-center border-none bg-transparent p-0 text-left',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
  'disabled:cursor-default',
)

export const CC_TOOL_HEADLINE_STATIC = 'w-full min-w-0'

export const TOOL_HEADLINE_STATIC = cn(
  CC_TOOL_HEADLINE_STATIC,
  'flex w-full min-w-0 flex-col gap-[0.04rem]',
)

export const CC_TOOL_HEADLINE = cn(
  TOOL_TITLE_ROW,
)

export const ORCHESTRATION_PENDING_LABEL = cn(
  EDITOR_PIXEL_TOOL_ROW,
  'min-h-[1.35rem] font-bold uppercase',
)

export const CC_TOOL_ARGS =
  'text-[0.78rem] font-normal leading-[1.35rem] text-muted-foreground/80'

export const CC_TOOL_MERGE =
  'font-medium text-muted-foreground/80'

export function ccToolBranchClass(opts?: {
  nested?: boolean
  hasLeadIcon?: boolean
}) {
  const noOffset = opts?.nested || opts?.hasLeadIcon === false
  return cn(
    'flex max-w-full flex-row items-start gap-[0.3rem] pt-[0.05rem]',
    noOffset ? 'pl-0' : 'pl-[calc(1.35rem+0.4rem)]',
  )
}

/** @deprecated 业务层请用 timeline/layout/TimelineBranchRow，勿直接拼 ccToolBranchClass */

export const CC_BRANCH_CONTENT = cn(
  'min-w-0 flex-1 break-words text-[0.74rem] leading-[1.35] text-muted-foreground/80',
)

export const CC_TOOL_BRANCH_IN_ROUND = cn(
  'mt-[0.2rem] flex w-full max-w-full flex-row items-start gap-[0.35rem] pl-[calc(1.35rem+0.4rem)]',
)

export const THINK_TREE_GLYPH_CELL = CC_BRANCH_GLYPH

export const CC_PROGRESS_HINT =
  'ml-auto text-[0.68rem] leading-[1.4] text-muted-foreground/80'

export const TOOL_OUTCOME_SUCCESS = 'font-semibold text-primary'

export const TOOL_OUTCOME_ERROR = 'font-semibold text-destructive'

export const FAIL_TAG = TOOL_OUTCOME_ERROR

export function toolDetailClass(error?: boolean) {
  return cn(
    'm-0 w-full pl-0 text-[0.74rem] leading-[1.45]',
    error ? 'text-destructive' : 'text-muted-foreground/80',
  )
}

export const TOOL_DETAIL_TREE = cn(
  'mt-[0.12rem] flex w-full max-w-full flex-row items-start gap-[0.3rem] pl-0',
)

export const TOOL_DETAIL_PANEL = 'mt-[0.2rem] w-full pl-[0.15rem]'

export const TOOL_DETAIL_TOGGLE = cn(
  'inline-flex cursor-pointer items-center gap-[0.35rem] border-2 border-transparent bg-transparent px-[0.2rem] py-[0.1rem] font-mono text-[0.68rem] leading-[1.4] text-muted-foreground',
  'hover:border-foreground hover:bg-muted/40 hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
)

export function toolDetailChevronClass(open?: boolean) {
  return cn(
    'size-[0.38rem] shrink-0 border-b-[1.5px] border-r-[1.5px] border-[#64748b] transition-transform duration-[0.25s] ease-in-out',
    open ? '-rotate-[135deg]' : 'rotate-45',
  )
}

export const TOOL_DETAIL_SECTION = 'mt-[0.35rem] max-w-full'

export const TOOL_DETAIL_SECTION_LABEL =
  'mb-[0.2rem] text-[0.68rem] font-semibold leading-[1.4] text-[#64748b]'

export function toolDetailPreClass(error?: boolean) {
  return cn(
    'm-0 max-h-64 overflow-auto border-2 border-foreground bg-muted/30 p-[0.4rem] font-mono text-[0.68rem] leading-[1.45] whitespace-pre-wrap break-words shadow-[1px_1px_0_0_var(--foreground)]',
    error ? 'text-destructive' : 'text-muted-foreground',
  )
}

export const SELECTED_CHOICE_ROW =
  'mx-0 my-0 flex flex-col gap-[0.18rem] border-none bg-transparent px-0 py-[0.2rem] pb-[0.28rem]'

export const SELECTED_BADGE =
  'text-[0.68rem] font-semibold leading-[1.4] text-[#64748b]'

export const SELECTED_TITLE =
  'text-[0.74rem] font-semibold leading-[1.45] text-foreground'

export const SELECTED_DESC =
  'text-[0.68rem] leading-[1.4] text-[#64748b]'

export const CHOICE_LIST =
  'mt-[0.1rem] flex w-full flex-col gap-[0.28rem] p-0'

export function ccChoiceButtonClass(active?: boolean) {
  return editorPixelChoiceButtonClass(active)
}

export const STEP_PROMPT =
  'mb-[0.1rem] text-[0.74rem] leading-[1.45] text-[#475569]'

export const CHOICE_REVEAL = 'agent-timeline-choice-reveal'

export function choiceRevealStyle(delayMs = 0): CSSProperties {
  return { animationDelay: `${delayMs}ms` }
}

export const MULTI_SELECT_ACTIONS =
  'flex items-center justify-between gap-2'

export const MULTI_SELECT_HINT =
  'text-[0.68rem] leading-[1.4] text-[#64748b]'

export const CUSTOM_INPUT_ROW =
  'mt-[0.15rem] flex flex-col gap-[0.35rem]'

export const CUSTOM_HINT =
  'text-[0.68rem] leading-[1.4] text-[#64748b]'

export const CUSTOM_INPUT = EDITOR_PIXEL_INPUT

export const CHOICE_TITLE =
  'font-mono text-[0.74rem] font-bold leading-[1.45] text-foreground'

export const CHOICE_DESC = cn(
  'font-mono text-[0.68rem] leading-[1.4] text-muted-foreground',
  'max-md:line-clamp-2',
)

export function subagentPanelCardClass(active?: boolean) {
  return editorPixelSubagentWrapClass(active)
}

export function subagentStatusChipClass(kind: ToolVisualStatus) {
  const status = kind === 'error' ? 'error' : kind === 'loading' ? 'loading' : kind === 'idle' ? 'idle' : 'success'
  return cn(
    'inline-flex items-center gap-[0.15rem] whitespace-nowrap px-[0.45rem] py-[0.12rem] font-mono text-[0.68rem] font-bold uppercase',
    editorPixelStatusIconClass(status),
    'size-auto min-h-5 w-auto border-2',
  )
}

export const SUBAGENT_SUMMARY_BOX =
  'mt-[0.35rem] px-0 py-[0.05rem] pb-[0.1rem] text-[0.74rem] leading-[1.45] text-foreground'

export const TIMELINE_BODY_DIVIDER = 'hidden'

export const DELIVERY_BODY_WRAP = cn(
  ORCHESTRATION_NARRATION,
  'agent-timeline-delivery-body m-0 mt-2 min-w-0 w-full max-w-full flex-1 max-md:pb-0',
)

export const DELIVERY_COLLAPSE_TOGGLE = cn(
  'mt-1.5 inline-flex border-none bg-transparent p-0 text-left text-[0.68rem] font-medium leading-[1.4] text-muted-foreground',
  'hover:text-foreground hover:underline',
  'focus-visible:rounded focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_rgba(79,70,229,0.15)]',
)

export const MOBILE_PROCESS_TOGGLE = cn(
  'mt-2 inline-flex min-h-9 w-full items-center justify-between gap-2 border-2 border-foreground bg-neon/20 px-3 py-2 text-left font-mono text-[0.75rem] font-bold uppercase leading-snug text-foreground shadow-soft',
  'hover:bg-neon/35',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
)

export const TIMELINE_PENDING_IN = 'agent-timeline-pending-in'

export const TIMELINE_STREAM_CURSOR = 'agent-timeline-stream-cursor'

export const SUBAGENT_PANEL_ROOT = 'mx-0 my-[0.04rem] mb-[0.1rem] w-full'

/* ── Todo list / message todo / tool excerpt / subagent modal ── */

export const TIMELINE_TODO_WRAP = 'flex w-full flex-col gap-[0.35rem]'

export const TIMELINE_TODO_META =
  'text-[0.68rem] font-medium leading-[1.4] text-muted-foreground'

export const TIMELINE_TODO_LIST =
  'm-0 flex list-none flex-col gap-[0.22rem] p-0'

export function timelineTodoRowClass(status: 'pending' | 'in_progress' | 'completed' | 'cancelled') {
  return cn(
    'agent-timeline-todo-row-in flex items-start gap-[0.4rem] px-0 py-[0.12rem]',
    status === 'cancelled' && 'opacity-55',
  )
}

export function timelineTodoTextClass(opts: { done?: boolean; executing?: boolean }) {
  return cn(
    'min-w-0 flex-1 text-[0.74rem] font-medium leading-[1.45] text-muted-foreground',
    opts.done && 'line-through opacity-70',
  )
}

export const MESSAGE_TODO_WRAP = 'mx-0 mb-0 mt-[0.35rem] w-full p-0'

export const MESSAGE_TODO_TITLE =
  'text-[0.74rem] font-semibold leading-[1.45] text-foreground'

export const MESSAGE_TODO_META =
  'whitespace-nowrap text-[0.68rem] font-normal leading-[1.4] text-muted-foreground'

export const MESSAGE_TODO_HEADER =
  'group mb-[0.2rem] inline-flex w-full cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-[0.35rem] border-none bg-transparent p-0 text-left disabled:cursor-default focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/45 hover:enabled:[&_.msg-todo-meta]:text-muted-foreground'

export const MESSAGE_TODO_MORE =
  'mt-[0.15rem] cursor-pointer border-none bg-transparent p-0 text-left text-[0.68rem] font-medium leading-[1.4] text-muted-foreground hover:text-muted-foreground hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/45'

export function toolExcerptClass(lineCount: number, mono?: boolean, maxLines = 20) {
  return cn(
    'break-words whitespace-pre-wrap pr-[0.15rem] text-[0.74rem] font-medium leading-[1.45] text-muted-foreground',
    mono && 'font-mono',
    lineCount >= maxLines && `max-h-[calc(${maxLines}*1.45em)] overflow-y-auto`,
  )
}

export const SUBAGENT_TIMELINE_WRAP = 'w-full px-[0.1rem] py-[0.05rem] pb-[0.15rem]'

export const SUBAGENT_TURN_META = 'mt-[0.2rem] text-[0.72rem] text-muted-foreground'

export const SUBAGENT_ERROR_BOX =
  'mt-[0.4rem] border-2 border-destructive bg-destructive/10 px-2 py-[0.4rem] font-mono text-[0.78rem] leading-[1.45] text-destructive'

export function toolStatusDotCellClass(opts: { loading?: boolean; inline?: boolean }) {
  return cn(
    'inline-flex select-none justify-center text-[0.72rem] leading-[1.35]',
    opts.loading && 'agent-tool-status-dot-blink',
    opts.inline
      ? 'size-full items-center'
      : 'w-[1.35rem] shrink-0 items-start pt-[0.05rem]',
  )
}

export function toolStatusDotGlyphClass(opts: {
  loading?: boolean
  error?: boolean
  success?: boolean
}) {
  return cn(
    'font-semibold',
    opts.error && 'text-destructive',
    opts.success && 'text-primary',
    opts.loading && !opts.error && 'text-muted-foreground',
    !opts.loading && !opts.error && !opts.success && 'text-foreground',
  )
}

export function todoRowIconSlotClass(active?: boolean) {
  return cn(
    'mt-[0.14rem] inline-flex size-[0.95rem] shrink-0 items-center justify-center',
    active ? 'text-primary drop-shadow-[0_0_4px_rgba(79,70,229,0.35)]' : 'text-muted-foreground',
  )
}

export function todoRowIconSvgClass(animate?: boolean) {
  return cn('block', animate && 'agent-todo-stroke-pulse [&_path]:[stroke-dasharray:40] [&_rect]:[stroke-dasharray:40] [&_circle]:[stroke-dasharray:40]')
}

