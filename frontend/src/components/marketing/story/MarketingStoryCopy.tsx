import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { PixelText } from '../pixel/PixelText'
import { marketingInViewMotion } from '../motion/marketingInViewMotion'
import { SCENE_TIMELINE_STEPS } from '@/lib/marketingStoryTimelineConfig'
import { scrollRevealStyle, timelineStepState } from '@/lib/marketingStoryScroll'
import type { MarketingSceneId } from '@/utils/marketing/buildMarketingSceneDemo'
import {
  STORY_ACT_INDEX,
  STORY_ACT_LABEL,
  STORY_ACT_ROW,
  STORY_COPY_BLOCK,
  STORY_LEAD,
  STORY_POINT_HIGHLIGHT,
  STORY_POINT_ITEM,
  STORY_POINT_LIST,
  STORY_TITLE,
  STORY_TITLE_ACCENT,
  storyCopyRootClass,
} from '@/lib/cursorLandingClasses'

export interface StoryPoint {
  highlight: string
  text: string
}

interface MarketingStoryCopyProps {
  act: string
  label: string
  title: string
  titleAccent: string
  lead: string
  points: StoryPoint[]
  alignEnd?: boolean
  className?: string
  scene?: MarketingSceneId
  scrollProgress?: number
}

export function MarketingStoryCopy({
  act,
  label,
  title,
  titleAccent,
  lead,
  points,
  alignEnd: _alignEnd,
  className,
  scene,
  scrollProgress,
}: MarketingStoryCopyProps) {
  const reduced = useReducedMotion()
  const isMobile = useAppMobile()
  const scrollSync = scrollProgress !== undefined && !reduced

  const copyReveal = marketingInViewMotion({
    isMobile,
    reduced: Boolean(reduced),
    desktopInitial: { opacity: 0, y: 20 },
    desktopWhileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-5% 0px', amount: 0.2 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  })

  const titleCell = isMobile ? 12 : 16
  const accentCell = isMobile ? 12 : 16
  const accentDot = isMobile ? 1.15 : 1.45
  const titleDot: [number, number] = isMobile ? [0.85, 1.55] : [1.3, 2.6]

  const pointStates = useMemo(() => {
    if (!scene || scrollProgress === undefined) return points.map(() => 'pending' as const)
    const steps = SCENE_TIMELINE_STEPS[scene]
    return points.map((_, idx) => {
      const stepIndex = steps.findIndex((s) => s.copyPointIndex === idx)
      if (stepIndex < 0) return 'pending' as const
      return timelineStepState(stepIndex, scrollProgress, steps.length)
    })
  }, [points, scene, scrollProgress])

  const actStyle = scrollSync ? scrollRevealStyle(scrollProgress, 0, 0.08) : undefined
  const titleStyle = scrollSync ? scrollRevealStyle(scrollProgress, 0.04, 0.18) : undefined
  const accentStyle = scrollSync ? scrollRevealStyle(scrollProgress, 0.1, 0.24) : undefined
  const leadStyle = scrollSync ? scrollRevealStyle(scrollProgress, 0.16, 0.32) : undefined

  const inner = (
    <div className={cn(STORY_COPY_BLOCK, 'story-copy-block')}>
      <div className={STORY_ACT_ROW} style={actStyle}>
        <span className={STORY_ACT_INDEX}>
          <PixelText text={act} size="sm" fontWeight={800} presentational />
        </span>
        <span className={STORY_ACT_LABEL}>{label}</span>
      </div>

      <h3 className={STORY_TITLE}>
        <div className="w-full" style={titleStyle}>
          <PixelText
            text={title}
            cell={titleCell}
            fill
            fillFit
            fillAlign="left"
            dotRange={titleDot}
            glyphGap={1}
            fontWeight={800}
            className="text-muted-foreground"
            presentational
          />
        </div>
        <span className={STORY_TITLE_ACCENT}>
          <div className="w-full" style={accentStyle}>
            <PixelText
              text={titleAccent}
              cell={accentCell}
              dot={accentDot}
              glyphGap={1}
              fontWeight={900}
              className="text-primary"
              presentational
            />
          </div>
        </span>
      </h3>

      <p className={STORY_LEAD} style={leadStyle}>
        {lead}
      </p>

      <ul className={STORY_POINT_LIST}>
        {points.map((point, index) => {
          const pointStyle = scrollSync
            ? scrollRevealStyle(scrollProgress, 0.22 + index * 0.1, 0.36 + index * 0.1)
            : undefined
          return (
            <li
              key={point.highlight}
              className={cn(
                STORY_POINT_ITEM,
                pointStates[index] === 'active' && 'story-point-active',
                pointStates[index] === 'done' && 'story-point-done',
              )}
              style={pointStyle}
            >
              <span className={STORY_POINT_HIGHLIGHT}>{point.highlight}</span>
              <span className="text-muted-foreground" aria-hidden>
                ·
              </span>
              <span>{point.text}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )

  if (scrollSync) {
    return (
      <div className={cn(storyCopyRootClass(alignEnd), className)}>
        {inner}
      </div>
    )
  }

  return (
    <div className={cn(storyCopyRootClass(alignEnd), className)}>
      <motion.div {...copyReveal}>{inner}</motion.div>
    </div>
  )
}
