import { cn } from '@/lib/utils'

/* ── Editor app mock (三栏编辑器) ── */

export const DEMO_APP_MOCK_ROOT = cn(
  'mx-auto w-full max-w-[920px] overflow-hidden rounded-xl border border-border/80 bg-background',
  'shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04),0_24px_64px_rgba(0,0,0,0.12)]',
  '[transform-style:preserve-3d] will-change-[transform,opacity]',
  'max-sm:rounded-lg max-sm:text-[0.94em]',
)

export const DEMO_APP_BROWSER_BAR = cn(
  'flex items-center gap-[0.65rem] border-b border-border bg-gradient-to-b from-[#f6f6f6] to-[#ececec] px-[0.85rem] py-[0.55rem]',
  'max-sm:gap-[0.45rem] max-sm:px-[0.55rem] max-sm:py-[0.45rem]',
)

export const DEMO_BROWSER_TRAFFIC = 'flex shrink-0 gap-1.5'
export const DEMO_BROWSER_DOT = 'size-2.5 rounded-full'
export const DEMO_BROWSER_DOT_RED = 'bg-[#ff5f56]'
export const DEMO_BROWSER_DOT_YELLOW = 'bg-[#ffbd2e]'
export const DEMO_BROWSER_DOT_GREEN = 'bg-[#27c93f]'
export const DEMO_BROWSER_TITLE =
  'whitespace-nowrap text-[0.72rem] font-semibold text-muted-foreground'
export const DEMO_BROWSER_URL = cn(
  'mkt-demo-url-shimmer min-w-0 flex-1 rounded-sm border border-border bg-background px-[0.55rem] py-[0.28rem] text-[0.68rem] text-muted-foreground',
  'max-sm:hidden',
)
export const DEMO_BROWSER_LIVE = cn(
  'shrink-0 rounded-sm bg-[rgba(127,186,0,0.12)] px-[0.45rem] py-[0.2rem] text-[0.62rem] font-bold uppercase tracking-[0.08em] text-emerald-500',
  'max-sm:hidden',
)

export const DEMO_APP_WORKSPACE = cn(
  'grid min-h-[380px] max-h-[420px] grid-cols-[168px_minmax(0,1fr)_minmax(0,1.05fr)]',
  'max-[820px]:max-h-none max-[820px]:min-h-[300px] max-[820px]:grid-cols-1',
  'max-sm:min-h-[260px]',
)

export const DEMO_APP_SIDEBAR = cn(
  'flex flex-col gap-2 overflow-hidden border-r border-border bg-background px-2 py-[0.65rem]',
  'max-[820px]:hidden',
)

export const DEMO_APP_SIDEBAR_NOVEL = 'border-b border-border px-[0.4rem] pb-2 pt-[0.35rem]'
export const DEMO_APP_SIDEBAR_NOVEL_NAME =
  'text-[0.74rem] font-bold leading-[1.3] text-foreground'
export const DEMO_APP_SIDEBAR_NOVEL_META = 'mt-[0.2rem] text-[0.65rem] text-muted-foreground'

export function demoChapterItemClass(active?: boolean) {
  return cn(
    'flex items-center gap-[0.35rem] rounded-md px-[0.45rem] py-[0.38rem] text-[0.72rem] text-muted-foreground will-change-[opacity,transform]',
    '[&_.idx]:w-[1.1rem] [&_.idx]:shrink-0 [&_.idx]:text-[0.62rem] [&_.idx]:text-muted-foreground',
    active &&
      cn(
        'mkt-demo-live-pulse bg-primary/10 font-semibold text-foreground',
        '[&_.idx]:text-[#3730a3]',
      ),
  )
}

export const DEMO_APP_EDITOR_PANE = cn(
  'flex flex-col gap-[0.55rem] overflow-hidden border-r border-border bg-background px-[0.85rem] pb-4 pt-3',
  'max-sm:hidden',
)

export const DEMO_APP_EDITOR_TITLE = 'm-0 text-[0.74rem] font-bold text-foreground'
export const DEMO_APP_EDITOR_BODY = 'flex flex-1 flex-col gap-[0.45rem] overflow-hidden'

export const DEMO_APP_EDITOR_LINE =
  'm-0 text-[0.8rem] leading-[1.7] text-[#334155] will-change-[opacity,transform,clip-path]'
export const DEMO_APP_EDITOR_LINE_MUTED = 'text-[0.74rem] text-muted-foreground'
export const DEMO_APP_EDITOR_LINE_STREAM = 'font-mono text-primary'

export const DEMO_APP_AGENT_PANE = 'flex min-h-0 flex-col bg-card'
export const DEMO_APP_AGENT_TOP = cn(
  'flex items-center justify-between gap-2 border-b border-border px-[0.65rem] py-[0.55rem]',
)
export const DEMO_APP_AGENT_SESSION =
  'overflow-hidden text-ellipsis whitespace-nowrap text-[0.74rem] font-semibold text-foreground'
export const DEMO_APP_AGENT_MODEL = cn(
  'shrink-0 rounded-sm border border-border px-[0.4rem] py-[0.18rem] text-[0.62rem] font-semibold text-muted-foreground',
)

export const DEMO_APP_AGENT_SCROLL =
  'flex flex-1 flex-col gap-2 overflow-hidden px-[0.6rem] pb-[0.35rem] pt-[0.55rem]'

export const DEMO_APP_USER_BUBBLE = cn(
  'max-w-[92%] self-end rounded-lg rounded-br-sm border border-primary/15 bg-primary/5 px-[0.55rem] py-[0.45rem]',
  'text-[0.78rem] leading-[1.45] text-foreground will-change-[opacity,transform]',
)

export const DEMO_APP_AGENT_TIMELINE = 'flex min-h-0 flex-col gap-[0.35rem]'

export const DEMO_APP_COMPOSER_STUB = 'mt-auto border-t border-border px-[0.55rem] pb-[0.55rem] pt-[0.45rem]'
export const DEMO_APP_COMPOSER_BOX = cn(
  'flex items-center gap-[0.4rem] rounded-lg border border-border bg-background px-2 py-[0.42rem]',
)
export const DEMO_APP_COMPOSER_PLACEHOLDER = 'flex-1 text-[0.72rem] text-muted-foreground'
export const DEMO_APP_COMPOSER_SEND = 'size-7 shrink-0 rounded-md bg-primary'

/* ── Agent trace console ── */

export const DEMO_AGENT_CONSOLE = cn(
  'mkt-demo-console-glow flex w-full max-w-[480px] flex-col gap-[0.45rem] rounded-lg border border-border bg-card p-[0.85rem] pb-[0.95rem] pl-[0.75rem] text-left',
  '[transform-style:preserve-3d]',
)

export const DEMO_AGENT_CHROME = cn(
  'mb-[0.15rem] flex items-center gap-1.5 border-b border-border pb-[0.35rem]',
)
export const DEMO_AGENT_CHROME_DOT = 'size-[9px] rounded-full'
export const DEMO_AGENT_CHROME_LABEL =
  'ml-auto text-[0.68rem] font-semibold tracking-[0.06em] text-muted-foreground'

export function demoThinkBlockClass(active?: boolean) {
  return cn(
    'flex flex-col gap-[0.35rem] border-l-2 pl-[0.45rem]',
    active ? 'border-emerald-500' : 'border-border',
  )
}

export function demoThinkHeaderClass(active?: boolean) {
  return cn(
    'flex min-h-[1.35rem] items-center gap-[0.45rem]',
    '[&_.title]:text-[0.74rem] [&_.title]:font-semibold [&_.title]:leading-[1.45] [&_.title]:text-muted-foreground',
    '[&_.meta]:text-[0.68rem] [&_.meta]:text-muted-foreground',
    active && '[&_.title]:mkt-demo-think-title-shimmer',
  )
}

export const DEMO_THINK_LINE =
  'm-0 text-[0.74rem] leading-[1.55] text-[#334155] will-change-[opacity,transform]'

export const DEMO_THINK_CURSOR = cn(
  'mkt-demo-blink-cursor inline-block h-[1em] w-0.5 align-text-bottom bg-primary will-change-[opacity]',
  'ml-0.5',
)

export const DEMO_ORCH_HEADER = cn(
  'flex w-full cursor-default items-center gap-[0.4rem] border-none bg-transparent px-0 py-[0.15rem] text-left',
  '[&_.chevron]:size-[0.42rem] [&_.chevron]:shrink-0 [&_.chevron]:rotate-[-135deg] [&_.chevron]:border-b-[1.5px] [&_.chevron]:border-r-[1.5px] [&_.chevron]:border-muted-foreground',
  '[&_.title]:text-[0.74rem] [&_.title]:font-semibold [&_.title]:leading-[1.45] [&_.title]:text-foreground',
)

export const DEMO_ORCH_HEADER_STATIC = cn(DEMO_ORCH_HEADER, 'pointer-events-none mb-[0.35rem]')

export const DEMO_TOOL_LIST = 'flex flex-col gap-[0.22rem] pl-[0.2rem]'
export const DEMO_TOOL_LIST_COMPACT = 'flex flex-col gap-1'

export const DEMO_TOOL_ROW = cn(
  'flex items-start gap-[0.45rem] py-[0.28rem] pl-0 pr-[0.15rem] will-change-[opacity,transform]',
  '[&_.lead]:flex [&_.lead]:size-[1.35rem] [&_.lead]:shrink-0 [&_.lead]:items-center [&_.lead]:justify-center',
  '[&_.body]:min-w-0 [&_.body]:flex-1',
  '[&_.headline]:flex [&_.headline]:flex-wrap [&_.headline]:items-center [&_.headline]:gap-x-2 [&_.headline]:gap-y-1 [&_.headline]:text-[0.74rem] [&_.headline]:leading-[1.35]',
  '[&_.name]:font-bold [&_.name]:text-foreground',
  '[&_.args]:font-normal [&_.args]:text-muted-foreground',
  '[&_.excerpt]:mt-[0.2rem] [&_.excerpt]:pl-[0.1rem] [&_.excerpt]:text-[0.74rem] [&_.excerpt]:leading-[1.45] [&_.excerpt]:text-muted-foreground',
)

export const DEMO_TOOL_ROW_COMPACT = cn(DEMO_TOOL_ROW, 'py-[0.15rem]')

export function demoStatusDotClass(status: 'idle' | 'loading' | 'success') {
  return cn(
    'size-2 shrink-0 rounded-full',
    status === 'success' && 'bg-emerald-500',
    status === 'loading' && 'bg-primary shadow-[0_0_8px_rgba(79,70,229,0.3)]',
    status === 'idle' && 'bg-[#94a3b8]',
  )
}

export const DEMO_SUBAGENT_WRAP = cn(
  'mt-[0.15rem] rounded-md border border-primary/15 bg-background px-2 py-[0.55rem] pb-[0.6rem] will-change-[opacity,transform]',
  '[&_.sub-head]:mb-[0.45rem] [&_.sub-head]:text-[0.72rem] [&_.sub-head]:font-bold [&_.sub-head]:tracking-[0.04em] [&_.sub-head]:text-[#3730a3]',
)

export const DEMO_STREAM_BLOCK = cn(
  'flex min-h-[220px] flex-col gap-[0.55rem] rounded-md bg-background p-4 pb-[1.1rem] will-change-[opacity,transform]',
)

export const DEMO_STREAM_BLOCK_FLAT = cn(
  DEMO_STREAM_BLOCK,
  'min-h-0 border-none bg-transparent p-0',
)

export const DEMO_STREAM_LABEL =
  'text-[0.68rem] font-bold uppercase tracking-[0.1em] text-emerald-500'

export const DEMO_STREAM_LINE =
  'm-0 font-mono text-[0.88rem] leading-[1.75] text-primary will-change-[opacity,transform]'

export const DEMO_STREAM_CURSOR = cn(
  'mkt-demo-blink-cursor-fast inline-block h-[1.1em] w-0.5 align-text-bottom bg-primary',
  'ml-[3px]',
)

/* ── Capability mini demo ── */

export const DEMO_MINI_WRAP = cn(
  'mt-[0.85rem] min-h-[5.5rem] rounded-[10px] border border-border bg-card px-[0.7rem] py-[0.65rem] text-left text-[0.72rem] text-muted-foreground',
)

export function demoOrchLineClass(active?: boolean) {
  return cn(
    'flex items-center gap-[0.4rem] py-[0.2rem] transition-opacity duration-250 ease-in-out',
    '[&_.name]:font-mono [&_.name]:text-[0.68rem] [&_.name]:font-semibold',
    active ? 'text-foreground opacity-100' : 'text-foreground opacity-45',
  )
}

export const DEMO_MINI_STREAM_LINE = 'leading-[1.45] text-foreground'

export const DEMO_MINI_CURSOR = cn(
  'mkt-demo-blink-cursor inline-block h-[0.85em] w-0.5 align-text-bottom bg-emerald-500',
  'ml-px',
)
