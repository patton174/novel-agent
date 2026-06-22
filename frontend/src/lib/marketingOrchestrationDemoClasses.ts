import { cn } from '@/lib/utils'

export const ORCH_DEMO_SHELL = cn(
  'flex h-full min-h-0 flex-col overflow-hidden bg-card px-3 pb-3 pt-3 text-foreground sm:px-4 sm:pb-4 sm:pt-4',
)

export const ORCH_DEMO_BODY = 'flex min-h-0 flex-1 flex-col overflow-hidden'

export const ORCH_DEMO_HEADER =
  'shrink-0 font-mono text-[0.72rem] font-bold uppercase tracking-wide text-foreground md:text-[0.82rem]'

export const ORCH_DEMO_PROMPT_BUBBLE = cn(
  'mb-3 mt-2 max-w-[min(88%,22rem)] self-end border-2 border-foreground bg-neon/20 px-2.5 py-1.5',
  'font-mono text-[0.72rem] leading-[1.5] text-foreground shadow-[2px_2px_0_0_var(--foreground)]',
  'md:mb-4 md:mt-3 md:max-w-[min(70%,26rem)] md:px-3 md:py-2 md:text-[0.82rem] md:leading-[1.55]',
)

export const ORCH_DEMO_TIMELINE = 'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scroll-smooth py-1'

export const ORCH_DEMO_STATUS_LINE = cn(
  'flex items-center gap-2 font-mono text-[0.78rem] font-bold uppercase tracking-wide text-muted-foreground',
)

export function orchDemoThinkBlockClass(expanded?: boolean) {
  return cn(
    'border-2 border-border bg-background px-2 py-1',
    expanded && 'border-l-[3px] border-l-primary pl-2.5',
  )
}

export const ORCH_DEMO_STEP_TITLE = cn(
  'flex min-h-[1.3rem] items-center gap-2 font-mono text-[0.78rem] font-bold text-foreground',
)

export const ORCH_DEMO_STEP_META =
  'orch-demo-meta hidden font-mono text-[0.72rem] font-normal text-muted-foreground sm:inline'

export const ORCH_DEMO_THINK_BODY = cn(
  'mt-1 max-w-[92%] font-mono text-[0.78rem] leading-[1.55] text-muted-foreground',
)

export const ORCH_DEMO_TOOL_ROW = cn(
  'flex items-center gap-2 font-mono text-[0.78rem] font-semibold text-muted-foreground',
)

export const ORCH_DEMO_SUBAGENT_WRAP = cn('border-2 border-dashed border-border bg-muted/30 p-2')

export const ORCH_DEMO_SUBAGENT_HEADER = 'flex min-h-[1.35rem] items-center gap-2'

export const ORCH_DEMO_SUBAGENT_TITLE = 'font-mono text-[0.78rem] font-bold text-foreground'

export const ORCH_DEMO_SUBAGENT_BRANCH = 'relative ml-3 mt-1 space-y-1 border-l-2 border-border py-0.5 pl-3'

export const ORCH_DEMO_SUBAGENT_LINE = cn(
  'flex min-h-[1.35rem] items-center gap-2 font-mono text-[0.76rem] font-medium text-foreground/85',
)

export function orchDemoSubagentDotClass(active?: boolean) {
  return cn(
    'size-2 shrink-0 border border-foreground',
    active ? 'bg-neon' : 'bg-muted-foreground/50',
  )
}

export const ORCH_DEMO_SUBAGENT_SUMMARY =
  'mt-1 font-mono text-[0.74rem] leading-[1.5] text-muted-foreground'

export const ORCH_DEMO_OUTPUT_TEXT = cn(
  'm-0 mt-4 max-w-full border-2 border-foreground bg-background px-3 py-2 font-mono text-[0.86rem] leading-[1.72] text-foreground shadow-[2px_2px_0_0_var(--foreground)]',
)

export const ORCH_DEMO_EMPTY_HINT = cn(
  'mt-auto flex items-center gap-2 font-mono text-[0.74rem] text-muted-foreground',
)

export function orchDemoTimelineIconClass(status: 'loading' | 'success' | 'idle') {
  return cn(
    'inline-flex size-5 shrink-0 items-center justify-center border border-foreground',
    status === 'loading' && 'bg-muted text-muted-foreground',
    status === 'success' && 'bg-primary text-primary-foreground',
    status === 'idle' && 'bg-background text-muted-foreground',
  )
}

export function orchDemoComposerClass(sending?: boolean) {
  return cn(
    'mt-3 w-full shrink-0 transition-[opacity,transform] duration-[220ms] ease-in-out',
    sending ? 'translate-y-px opacity-90' : 'translate-y-0 opacity-100',
  )
}

export const ORCH_DEMO_COMPOSER_CARD = cn(
  'mx-auto box-border w-full max-w-[520px] border-2 border-foreground bg-background px-2 pb-1.5 pt-1.5',
  'shadow-[2px_2px_0_0_var(--foreground)] md:pb-2 md:pt-2 md:shadow-[3px_3px_0_0_var(--foreground)]',
)

export const ORCH_DEMO_COMPOSER_TEXT = cn(
  'min-h-10 whitespace-pre-wrap px-1 py-1 font-mono text-[0.82rem] leading-[1.45] text-foreground',
)

export const ORCH_DEMO_COMPOSER_PLACEHOLDER = 'text-muted-foreground'

export const ORCH_DEMO_COMPOSER_ACTION_ROW =
  'flex items-center justify-between gap-2.5'

export const ORCH_DEMO_HOST_MODE = cn(
  'inline-flex items-center gap-1.5 font-mono text-[0.7rem] font-bold uppercase tracking-wide text-foreground/80',
)

export const ORCH_DEMO_SWITCH_MOCK =
  'mkt-demo-switch-mock relative h-[18px] w-[34px] border-2 border-foreground bg-muted'

export function orchDemoSendButtonClass(sending?: boolean, streaming?: boolean) {
  return cn(
    'inline-flex size-[34px] items-center justify-center border-2 border-foreground transition-[background,opacity,transform] duration-[120ms] ease-in-out',
    '[&_svg]:size-[17px]',
    streaming
      ? 'bg-destructive text-destructive-foreground shadow-[2px_2px_0_0_var(--foreground)]'
      : 'bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--foreground)]',
    sending ? 'scale-[0.94] opacity-[0.88]' : 'scale-100 opacity-100',
  )
}

export const ORCH_DEMO_COMPOSER_DISCLAIMER =
  'm-0 mt-1.5 hidden text-center font-mono text-[0.64rem] text-muted-foreground sm:block'
