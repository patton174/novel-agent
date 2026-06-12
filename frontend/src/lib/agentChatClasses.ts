import { cn } from '@/lib/utils'
import { MOTION_INTERACTIVE } from '@/lib/motionClasses'

export const STREAMING_REVEAL_WRAP =
  "font-['Noto_Serif_SC','Source_Han_Serif_SC','Songti_SC',Georgia,serif] tracking-wide"

export const STREAMING_REVEAL_PARAGRAPH =
  'mb-[0.55rem] leading-[1.85] text-foreground last:mb-0'

export const USER_CHAT_COLUMN = cn(
  'flex max-w-[min(85%,520px)] flex-col items-end gap-[0.35rem]',
)

export const USER_CHAT_BUBBLE = cn(
  'rounded-[18px] border border-primary/20 bg-primary/5 px-4 py-2.5',
  'whitespace-pre-wrap break-words text-[0.9rem] leading-[1.65] text-foreground',
  '[&_p]:mb-[0.4rem] [&_p:last-child]:mb-0',
)

export const USER_CHAT_ACTIONS = 'flex items-center gap-[0.15rem] pr-[0.15rem]'

export const USER_CHAT_ACTION_BTN = cn(
  'inline-flex size-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent',
  'text-slate-500',
  MOTION_INTERACTIVE,
  'hover:bg-primary/10 hover:text-slate-600',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
  '[&_svg]:size-[15px]',
)
