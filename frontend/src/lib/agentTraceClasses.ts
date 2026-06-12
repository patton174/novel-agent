import { cn } from '@/lib/utils'

export const GLOBAL_TRACE_PANEL = cn(
  'mx-6 mb-2 shrink-0 overflow-hidden rounded-xl border border-primary/20 bg-white/90 shadow-sm',
  'max-md:mx-3 max-md:mb-1.5 max-md:rounded-[10px]',
)

export const GLOBAL_TRACE_TITLE_ROW =
  'flex items-center gap-2 text-[0.78rem] font-bold text-slate-600'

export function globalTracePulseDotClass(active: boolean) {
  return cn(
    'size-2 shrink-0 rounded-full',
    active ? 'animate-agent-trace-pulse bg-primary' : 'bg-emerald-500',
  )
}

export const GLOBAL_TRACE_RUN_ID = 'text-[0.68rem] font-medium text-slate-400'

export const GLOBAL_TRACE_META = 'flex items-center gap-2 text-[0.72rem] text-slate-500'

export const GLOBAL_TRACE_LIVE_BADGE = 'font-semibold text-indigo-900'

export function globalTraceChevronClass(open: boolean) {
  return cn('inline-block transition-transform duration-200', open && 'rotate-90')
}

export const GLOBAL_TRACE_STEP_LIST = cn(
  'm-0 max-h-40 list-none overflow-y-auto p-0 px-[0.85rem] pb-[0.65rem]',
  'max-md:max-h-[120px] max-md:px-[0.65rem] max-md:pb-2',
)

export const GLOBAL_TRACE_STEP_ROW =
  'flex items-start gap-2 border-t border-border py-[0.35rem]'

export function agentTraceStatusDotClass(opts?: { failed?: boolean; active?: boolean }) {
  return cn(
    'mt-[5px] size-[7px] shrink-0 rounded-full',
    opts?.failed ? 'bg-red-600' : opts?.active ? 'bg-primary' : 'bg-emerald-500',
  )
}

export const GLOBAL_TRACE_STEP_MAIN = 'min-w-0 flex-1'

export const GLOBAL_TRACE_STEP_TITLE = cn(
  'truncate text-[0.76rem] font-semibold text-slate-600',
  'max-md:text-[0.72rem]',
)

export const GLOBAL_TRACE_STEP_META = 'mt-0.5 text-[0.68rem] text-slate-500'

export const GLOBAL_TRACE_EMPTY_HINT = 'list-none py-[0.35rem] text-[0.72rem] text-slate-400'

export const ASSISTANT_TRACE_TIMELINE = cn(
  'flex flex-col gap-[0.35rem] border-b border-border px-4 pb-[0.35rem] pt-[0.45rem]',
)

export const ASSISTANT_TRACE_ACTIVITY_ROW =
  'flex min-h-5 items-center gap-2'

export const ASSISTANT_TRACE_ACTIVITY_LABEL = 'text-[0.78rem] font-medium text-slate-600'

export const ASSISTANT_TRACE_TOOL_BLOCK = 'animate-agent-tool-fade-in'

export const ASSISTANT_TRACE_SPINNER = cn(
  'size-3 shrink-0 animate-spin rounded-full border-2 border-primary/50 border-t-primary',
)

export const ASSISTANT_TRACE_FAIL_BADGE = 'ml-auto text-[0.68rem] font-semibold text-red-600'

export const ASSISTANT_TRACE_DONE_HINT = 'ml-auto text-[0.68rem] text-emerald-500'

export const ASSISTANT_TRACE_PROGRESS_HINT =
  'ml-auto text-[0.68rem] font-medium text-indigo-900'

export function assistantTraceStepDetailClass(error?: boolean) {
  return cn(
    'm-0 ml-[1.35rem] mt-[0.2rem] whitespace-pre-wrap text-[0.72rem] leading-[1.45]',
    error ? 'text-red-800' : 'text-slate-500',
  )
}

export const ASSISTANT_TRACE_CHOICE_LIST =
  'ml-[0.2rem] mt-[0.35rem] mb-[0.15rem] flex flex-col gap-[0.35rem]'

export const ASSISTANT_TRACE_STEP_PROMPT =
  'mb-[0.2rem] text-[0.72rem] text-slate-400'

export const ASSISTANT_TRACE_MULTI_ACTIONS =
  'mt-[0.2rem] flex items-center justify-between gap-2'

export const ASSISTANT_TRACE_MULTI_HINT = 'text-[0.7rem] text-slate-500'

export const ASSISTANT_TRACE_CHOICE_TITLE = 'text-[0.78rem] font-semibold text-slate-600'

export const ASSISTANT_TRACE_CHOICE_DESC =
  'mt-[0.2rem] text-[0.71rem] leading-snug text-slate-400'
