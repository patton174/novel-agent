import { cn } from '@/lib/utils'

export const MARKETING_CHAT_DEMO_FRAME = cn(
  'pointer-events-none flex h-[min(520px,62vh)] w-full min-h-0 flex-col overflow-hidden border-2 border-foreground bg-card',
  'select-none shadow-soft',
)

export const MARKETING_CHAT_DEMO_FRAME_HERO = cn(
  MARKETING_CHAT_DEMO_FRAME,
  'mx-auto h-[min(460px,58vh)] max-w-[640px]',
)

export const MARKETING_CHAT_DEMO_FRAME_STORY = cn(
  MARKETING_CHAT_DEMO_FRAME,
  'h-[min(380px,48vh)] min-h-[300px]',
  'md:h-[min(560px,66vh)] md:min-h-[460px]',
)
