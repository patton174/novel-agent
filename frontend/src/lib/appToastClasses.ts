import { cn } from '@/lib/utils'
import type { AppToastKind } from '@/stores/appToastStore'

export const APP_TOAST_HOST = cn(
  'pointer-events-none fixed bottom-4 right-4 z-[2000]',
  'flex max-w-[min(360px,calc(100vw-2rem))] flex-col gap-[0.45rem]',
)

export function appToastCardClass(kind: AppToastKind) {
  return cn(
    'pointer-events-auto flex animate-agent-toast-in items-start gap-2 rounded-xl bg-white p-[0.65rem] px-3',
    'shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
    kind === 'error' && 'border border-red-500/35',
    kind === 'success' && 'border border-emerald-600/35',
    kind === 'info' && 'border border-border',
  )
}

export function appToastKindTagClass(kind: AppToastKind) {
  return cn(
    'shrink-0 rounded-md px-[0.4rem] py-[0.15rem] text-[0.62rem] font-bold',
    kind === 'error' && 'bg-red-500/10 text-red-500',
    kind === 'success' && 'bg-emerald-500/10 text-emerald-600',
    kind === 'info' && 'bg-primary/10 text-slate-600',
  )
}

export const APP_TOAST_MESSAGE =
  'min-w-0 flex-1 text-[0.8rem] leading-snug text-foreground'

export const APP_TOAST_DISMISS = cn(
  'm-0 size-5 shrink-0 cursor-pointer border-none bg-transparent p-0',
  'text-base leading-none text-slate-500 hover:text-foreground',
)
