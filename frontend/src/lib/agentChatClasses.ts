import { cn } from '@/lib/utils'
import { MOTION_INTERACTIVE } from '@/lib/motionClasses'
import { EDITOR_PIXEL_MONO_WRAP, EDITOR_PIXEL_USER_BUBBLE } from '@/lib/editorPixelClasses'

export const STREAMING_REVEAL_WRAP = cn(EDITOR_PIXEL_MONO_WRAP, 'text-[0.86rem] leading-[1.72]')

export const STREAMING_REVEAL_PARAGRAPH =
  'mb-[0.55rem] leading-[1.72] text-foreground last:mb-0'

export const USER_CHAT_COLUMN = cn(
  'ml-auto flex max-w-[min(85%,520px)] shrink-0 flex-col items-end gap-[0.35rem]',
)

export const USER_CHAT_BUBBLE = EDITOR_PIXEL_USER_BUBBLE

export const USER_CHAT_ACTIONS = 'flex items-center gap-[0.15rem] pr-[0.15rem]'

export const USER_CHAT_ACTION_BTN = cn(
  'inline-flex size-7 cursor-pointer items-center justify-center border-2 border-transparent bg-transparent',
  'text-muted-foreground',
  MOTION_INTERACTIVE,
  'hover:border-foreground hover:bg-neon/20 hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
  '[&_svg]:size-[15px]',
)
