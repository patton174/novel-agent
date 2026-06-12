import { cn } from '@/lib/utils'

export const MARKETING_CHAT_DEMO_FRAME = cn(
  'pointer-events-none flex h-[min(520px,62vh)] w-full min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#cbd5e1] bg-[#f8fafc]',
  'origin-top select-none shadow-[0_2px_8px_rgba(0,0,0,0.06),0_20px_48px_rgba(0,0,0,0.1)]',
  '[contain:layout_style_paint]',
)

export const MARKETING_CHAT_DEMO_FRAME_HERO = cn(
  MARKETING_CHAT_DEMO_FRAME,
  'mx-auto h-[min(460px,58vh)] max-w-[640px] border-[#e2e8f0] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]',
)

export const MARKETING_CHAT_DEMO_FRAME_STORY = cn(
  MARKETING_CHAT_DEMO_FRAME,
  'h-[min(560px,66vh)] min-h-[460px]',
)
