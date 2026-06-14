import { cn } from '@/lib/utils'

export const ORCH_DEMO_SHELL = cn(
  'flex h-full flex-col overflow-hidden bg-background px-5 pb-4 pt-4 text-foreground',
)

export const ORCH_DEMO_BODY = 'flex min-h-0 flex-1 flex-col overflow-hidden'

export const ORCH_DEMO_HEADER =
  'shrink-0 text-[0.92rem] font-[650] tracking-[-0.02em] text-foreground'

export const ORCH_DEMO_PROMPT_BUBBLE = cn(
  'mb-5 mt-[0.95rem] max-w-[min(70%,26rem)] self-end rounded-[18px] border border-[rgba(79,70,229,0.14)]',
  'bg-[rgba(79,70,229,0.05)] px-4 py-[0.6rem] text-[0.88rem] font-normal leading-[1.62] text-foreground',
)

export const ORCH_DEMO_TIMELINE = 'flex shrink-0 flex-col gap-[0.38rem]'

export const ORCH_DEMO_STATUS_LINE = cn(
  'flex items-center gap-[0.4rem] text-[0.84rem] font-semibold text-muted-foreground',
)

export function orchDemoThinkBlockClass(expanded?: boolean) {
  return cn('relative pl-0', expanded && 'mkt-demo-think-block-expanded')
}

export const ORCH_DEMO_STEP_TITLE = cn(
  'flex min-h-[1.3rem] items-center gap-[0.4rem] text-[0.84rem] font-semibold text-foreground/80',
)

export const ORCH_DEMO_STEP_META = 'text-[0.76rem] font-normal text-muted-foreground'

export const ORCH_DEMO_THINK_BODY = cn(
  'ml-7 mt-[0.26rem] max-w-[92%] text-[0.82rem] leading-[1.58] text-muted-foreground',
)

export const ORCH_DEMO_TOOL_ROW = cn(
  'flex items-center gap-[0.4rem] pl-7 text-[0.84rem] font-semibold text-muted-foreground',
)

export const ORCH_DEMO_SUBAGENT_WRAP = cn('pl-7')

export const ORCH_DEMO_SUBAGENT_HEADER = 'flex min-h-[1.35rem] items-center gap-[0.4rem]'

export const ORCH_DEMO_SUBAGENT_TITLE = 'text-[0.84rem] font-semibold text-foreground/80'

export const ORCH_DEMO_SUBAGENT_BRANCH = 'mkt-demo-subagent-branch relative ml-[0.68rem] mt-[0.2rem] py-[0.2rem] pl-4 pb-[0.05rem]'

export const ORCH_DEMO_SUBAGENT_LINE = cn(
  'flex min-h-[1.35rem] items-center gap-[0.45rem] whitespace-nowrap text-[0.8rem] font-medium text-foreground/75',
)

export function orchDemoSubagentDotClass(active?: boolean) {
  return cn(
    'size-[0.38rem] shrink-0 rounded-full',
    active
      ? 'bg-primary opacity-90 shadow-[0_0_0_3px_rgba(79,70,229,0.12)]'
      : 'bg-muted-foreground opacity-[0.55]',
  )
}

export const ORCH_DEMO_SUBAGENT_SUMMARY =
  'mt-[0.22rem] text-[0.78rem] leading-[1.5] text-muted-foreground'

export const ORCH_DEMO_OUTPUT_TEXT = cn(
  'm-0 mt-5 max-w-full text-[clamp(0.92rem,1.6vw,1.02rem)] leading-[1.78] tracking-[0.01em] text-foreground',
)

export const ORCH_DEMO_EMPTY_HINT = cn(
  'mt-auto flex items-center gap-[0.4rem] text-[0.78rem] text-muted-foreground',
)

export function orchDemoTimelineIconClass(status: 'loading' | 'success' | 'idle') {
  return cn(
    'inline-flex size-[1.35rem] shrink-0 items-center justify-center',
    status === 'loading' && 'text-muted-foreground',
    status === 'success' && 'text-primary',
    status === 'idle' && 'text-muted-foreground/70',
  )
}

export function orchDemoComposerClass(sending?: boolean) {
  return cn(
    'mt-[0.9rem] w-full shrink-0 transition-[opacity,transform] duration-[220ms] ease-in-out',
    sending ? 'translate-y-px opacity-90' : 'translate-y-0 opacity-100',
  )
}

export const ORCH_DEMO_COMPOSER_CARD = cn(
  'mx-auto box-border w-[min(92%,520px)] rounded-lg border border-border bg-background',
  'px-[0.65rem] pb-[0.42rem] pt-[0.45rem]',
)

export const ORCH_DEMO_COMPOSER_TEXT = cn(
  'min-h-10 whitespace-pre-wrap px-[0.1rem] py-[0.12rem] text-[0.86rem] leading-[1.45] text-foreground',
)

export const ORCH_DEMO_COMPOSER_PLACEHOLDER = 'text-muted-foreground'

export const ORCH_DEMO_COMPOSER_ACTION_ROW =
  'flex items-center justify-between gap-2.5'

export const ORCH_DEMO_HOST_MODE = cn(
  'inline-flex items-center gap-1.5 text-[0.72rem] font-semibold text-foreground/75',
)

export const ORCH_DEMO_SWITCH_MOCK =
  'mkt-demo-switch-mock relative h-[18px] w-[34px] rounded-full bg-muted shadow-[inset_0_1px_3px_rgba(15,23,42,0.16)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)]'

export function orchDemoSendButtonClass(sending?: boolean, streaming?: boolean) {
  return cn(
    'inline-flex size-[34px] items-center justify-center text-white transition-[background,border-radius,opacity,transform] duration-[120ms] ease-in-out',
    '[&_svg]:size-[17px]',
    streaming ? 'rounded-[10px] bg-[#ef4444]' : 'rounded-[11px] bg-[#4f46e5]',
    sending ? 'scale-[0.94] opacity-[0.88]' : 'scale-100 opacity-100',
  )
}

export const ORCH_DEMO_COMPOSER_DISCLAIMER =
  'm-0 mt-[0.28rem] text-center text-[0.66rem] text-muted-foreground'
