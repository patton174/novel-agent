import { cn } from '@/lib/utils'

export const MARKETING_CHAT_DEMO_FRAME = cn(
  'pointer-events-none flex h-[min(520px,62vh)] w-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background',
  'select-none shadow-sm',
)

export const MARKETING_CHAT_DEMO_FRAME_HERO = cn(
  MARKETING_CHAT_DEMO_FRAME,
  'mx-auto h-[min(460px,58vh)] max-w-[640px]',
)

export const MARKETING_CHAT_DEMO_FRAME_STORY = cn(
  MARKETING_CHAT_DEMO_FRAME,
  'h-[min(560px,66vh)] min-h-[460px]',
)
