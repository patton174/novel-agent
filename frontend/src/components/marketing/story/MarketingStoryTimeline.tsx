import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { MarketingSceneId } from '@/utils/marketing/buildMarketingSceneDemo'
import {
  MARKETING_TIMELINE_NODES_WRAP,
  MARKETING_TIMELINE_RAIL,
  MARKETING_TIMELINE_TRACK_BG,
  MARKETING_TIMELINE_TRACK_FILL,
  marketingTimelineConnectorClass,
  marketingTimelineNodeClass,
} from '@/lib/marketingStoryTimelineClasses'
import { SCENE_TIMELINE_STEPS } from '@/lib/marketingStoryTimelineConfig'
import { timelineRailFillPct, timelineStepState } from '@/lib/marketingStoryScroll'

interface MarketingStoryTimelineProps {
  scene: MarketingSceneId
  /** 0–1 scroll progress within section */
  progress: number
  className?: string
}

export function MarketingStoryTimeline({ scene, progress, className }: MarketingStoryTimelineProps) {
  const reduced = useReducedMotion()
  const steps = SCENE_TIMELINE_STEPS[scene]
  const effProgress = reduced ? 1 : progress

  const firstPct = steps[0]?.topPct ?? 10
  const lastPct = steps[steps.length - 1]?.topPct ?? 76
  const fillEndPct = timelineRailFillPct(effProgress, firstPct, lastPct)

  return (
    <div
      className={cn(MARKETING_TIMELINE_RAIL, className)}
      aria-hidden
      data-marketing-timeline={scene}
    >
      <div className={MARKETING_TIMELINE_NODES_WRAP}>
        <div
          className={MARKETING_TIMELINE_TRACK_BG}
          style={{ top: `${firstPct}%`, bottom: `${100 - lastPct}%` }}
        />
        <div
          className={MARKETING_TIMELINE_TRACK_FILL}
          style={{
            top: `${firstPct}%`,
            height: `${Math.max(0, fillEndPct - firstPct)}%`,
          }}
        />

        {steps.map((step, index) => {
          const state = timelineStepState(index, effProgress, steps.length)
          const side = step.stagger === 'left' ? 'left' : step.stagger === 'right' ? 'right' : null

          return (
            <div
              key={step.id}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${step.topPct}%` }}
            >
              <div className="relative flex items-center justify-center">
                {side === 'left' ? (
                  <span className={marketingTimelineConnectorClass('left')} />
                ) : null}
                <span className={marketingTimelineNodeClass({ state })} />
                {side === 'right' ? (
                  <span className={marketingTimelineConnectorClass('right')} />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
