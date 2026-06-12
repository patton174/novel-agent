import { cn } from '@/lib/utils'

export const STORY_SCENE = cn(
  'relative min-h-screen w-full scroll-mt-[72px]',
)

export const STORY_PIN = cn(
  'flex min-h-[calc(100vh-72px)] w-full items-center justify-center overflow-hidden will-change-transform',
)

export const STORY_SCENE_INNER = cn(
  'pointer-events-auto mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-8 px-6',
  'min-[961px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] min-[961px]:gap-10',
  'max-[960px]:text-center',
)

export const STORY_SCENE_COPY = cn('z-[2]')

export const STORY_SCENE_TAG = cn(
  'mb-3 inline-block text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#3730a3]',
)

export const STORY_SCENE_TITLE = cn(
  'm-0 mb-4 text-2xl font-bold leading-tight tracking-[-0.02em] text-[#0f172a]',
)

export const STORY_SCENE_BODY = cn(
  'm-0 mb-5 max-w-[28rem] text-base leading-[1.75] text-[#64748b]',
)

export const STORY_SCENE_LIST = cn(
  'm-0 flex list-none flex-col gap-2 p-0',
  '[&_li]:relative [&_li]:pl-[1.1rem] [&_li]:text-[0.9rem] [&_li]:text-[#475569]',
  '[&_li::before]:absolute [&_li::before]:left-0 [&_li::before]:top-[0.55em] [&_li::before]:size-1.5 [&_li::before]:rounded-full [&_li::before]:bg-[#4f46e5] [&_li::before]:content-[""]',
)

export const STORY_VISUAL_STAGE = cn(
  'relative flex min-h-[400px] w-full items-center justify-center',
)
