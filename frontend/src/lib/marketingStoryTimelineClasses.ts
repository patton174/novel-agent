import { cn } from '@/lib/utils'

/** 中间滚动时间线栏（左文案 | 中线 | 右演示） */
export const MARKETING_TIMELINE_RAIL = cn(
  'story-timeline relative flex h-full min-h-0 w-full self-stretch',
  'md:w-12 md:shrink-0 lg:w-14',
  'max-md:order-2 max-md:py-3',
)

export const MARKETING_TIMELINE_NODES_WRAP = cn(
  'relative mx-auto h-full w-full',
  'min-h-[min(460px,58vh)] md:min-h-0',
)

/** 主轴底色（首尾节点之间） */
export const MARKETING_TIMELINE_TRACK_BG = cn(
  'marketing-timeline-rail absolute left-1/2 w-[2px] -translate-x-1/2 bg-border/35',
)

/** 滚动填充段 */
export const MARKETING_TIMELINE_TRACK_FILL = cn(
  'marketing-timeline-rail-fill absolute left-1/2 w-[2px] -translate-x-1/2 origin-top bg-primary',
)

export function marketingTimelineNodeClass(opts: {
  state: 'pending' | 'active' | 'done'
}) {
  const { state } = opts
  return cn(
    'marketing-timeline-node relative z-[2] block size-2.5 shrink-0 border-2 border-foreground bg-background',
    'shadow-[1px_1px_0_0_var(--foreground)]',
    state === 'pending' && 'opacity-40',
    state === 'active' && 'border-primary bg-neon scale-110',
    state === 'done' && 'border-primary bg-primary',
  )
}

export function marketingTimelineConnectorClass(side: 'left' | 'right') {
  return cn(
    'marketing-timeline-connector absolute top-1/2 z-[1] h-[2px] w-3 -translate-y-1/2 bg-border',
    side === 'left' && 'right-[calc(50%+5px)]',
    side === 'right' && 'left-[calc(50%+5px)]',
  )
}
