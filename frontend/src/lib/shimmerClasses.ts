import { cn } from '@/lib/utils'

export const SHIMMER_ROW_HOST = 'relative isolate'

export const SHIMMER_OVERLAY = 'agent-shimmer-overlay'

export const SHIMMER_TEXT_ACTIVE = 'agent-shimmer-text-active'

export const SHIMMER_CLUSTER_ACTIVE = 'agent-shimmer-cluster-active'

export const SHIMMER_GRAPHIC_WRAP = cn(
  'relative inline-flex items-center justify-center leading-none',
  '[&>svg]:block',
)

export function shimmerGraphicClass(active?: boolean, className?: string) {
  return cn(SHIMMER_GRAPHIC_WRAP, active && 'agent-shimmer-graphic-active', className)
}

export function shimmerTextClass(active?: boolean, className?: string) {
  return cn(
    'inline-block [font-size:inherit] [font-weight:inherit] [letter-spacing:inherit]',
    active ? SHIMMER_TEXT_ACTIVE : 'text-muted-foreground',
    className,
  )
}

export function shimmerClusterClass(
  active?: boolean,
  row?: boolean,
  className?: string,
) {
  return cn(
    'inline-flex max-w-full flex-wrap items-center gap-x-[0.35rem] gap-y-[0.2rem]',
    row && 'min-w-0 w-full flex-[1_1_auto]',
    active && SHIMMER_CLUSTER_ACTIVE,
    className,
  )
}

export function shimmerBarTrackClass(
  compact?: boolean,
  className?: string,
) {
  return cn(
    'relative shrink-0 overflow-hidden rounded-full',
    compact ? 'bg-primary/5' : 'bg-primary/10',
    className,
  )
}

export function shimmerBarBeamClass(compact?: boolean) {
  return cn('agent-shimmer-bar-beam', compact && 'agent-shimmer-bar-beam--compact')
}

export const NOVELAI_CUBE_LOADER = 'novelai-cube-loader'

export const NOVELAI_CUBE_GRID = 'novelai-cube-loader__grid'

export const NOVELAI_CUBE_GRID_COMPACT = 'novelai-cube-loader__grid--compact'

export const NOVELAI_CUBE_CUBE = 'novelai-cube-loader__cube'

export const NOVELAI_CUBE_FACE = 'novelai-cube-loader__face'

export const NOVELAI_CUBE_FACE_SIDES = 'novelai-cube-loader__face--sides'

export const NOVELAI_CUBE_FACE_FRONT = 'novelai-cube-loader__face--front'

export const NOVELAI_CUBE_FACE_BACK = 'novelai-cube-loader__face--back'

export const NOVELAI_CUBE_FACE_LEFT = 'novelai-cube-loader__face--left'

export const NOVELAI_CUBE_FACE_RIGHT = 'novelai-cube-loader__face--right'

export const NOVELAI_CUBE_FACE_TOP = 'novelai-cube-loader__face--top'

export const NOVELAI_CUBE_FACE_BOTTOM = 'novelai-cube-loader__face--bottom'

export const THINKING_HAND_LOADER = 'thinking-hand-loader'

export const THINKING_HAND_HAND = 'thinking-hand-loader__hand'

export const THINKING_HAND_FINGER = 'thinking-hand-loader__finger'

export const THINKING_HAND_PALM = 'thinking-hand-loader__palm'

export const THINKING_HAND_THUMB = 'thinking-hand-loader__thumb'

export const STREAMING_PENCIL_CURSOR = 'streaming-pencil-cursor'

export const STREAMING_PENCIL_SVG = 'streaming-pencil-cursor__svg'
