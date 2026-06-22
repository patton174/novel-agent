import { useRef, useState, useEffect } from 'react'
import { useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { MarketingChatOrchestrationDemo } from './MarketingChatOrchestrationDemo'
import type { MarketingSceneId } from '../../../utils/marketing/buildMarketingSceneDemo'
import { MarketingStoryCopy, type StoryPoint } from '../story/MarketingStoryCopy'
import { MarketingStoryTimeline } from '../story/MarketingStoryTimeline'
import { easeInOutCubic } from '@/lib/marketingStoryScroll'
import {
  CURSOR_FEATURE_INNER,
  cursorFeatureGridClass,
  cursorFeatureSectionClass,
} from '@/lib/cursorLandingClasses'

export type MarketingSceneLayout = 'copy-left' | 'copy-right'

export interface MarketingChatSceneProps {
  scene: MarketingSceneId
  id: string
  layout: MarketingSceneLayout
  act: string
  label: string
  title: string
  titleAccent: string
  lead: string
  points: StoryPoint[]
}

export function MarketingChatScene({
  scene,
  id,
  layout,
  act,
  label,
  title,
  titleAccent,
  lead,
  points,
}: MarketingChatSceneProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const demoRef = useRef<HTMLDivElement>(null)
  const flip = layout === 'copy-right'
  const reduced = useReducedMotion()
  const isMobile = useAppMobile()
  const useScrollSync = !isMobile && !reduced
  const [progress, setProgress] = useState(reduced ? 1 : 0)

  const { scrollYProgress: demoScroll } = useScroll({
    target: demoRef,
    offset: ['start 0.9', 'end 0.12'],
  })

  const { scrollYProgress: sectionScroll } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  useMotionValueEvent(demoScroll, 'change', (demoV) => {
    if (!useScrollSync) return
    const raw = Math.min(demoV, sectionScroll.get())
    setProgress(easeInOutCubic(raw))
  })

  useMotionValueEvent(sectionScroll, 'change', (sectionV) => {
    if (!useScrollSync) return
    const raw = Math.min(demoScroll.get(), sectionV)
    setProgress(easeInOutCubic(raw))
  })

  useEffect(() => {
    if (!useScrollSync) {
      setProgress(0)
      return
    }
    if (reduced) {
      setProgress(1)
      return
    }
    const raw = Math.min(demoScroll.get(), sectionScroll.get())
    setProgress(easeInOutCubic(raw))
  }, [useScrollSync, reduced, demoScroll, sectionScroll])

  const scrollProgress = useScrollSync ? (reduced ? 1 : progress) : undefined

  return (
    <section
      ref={sectionRef}
      id={id}
      data-marketing-scene={scene}
      className={cursorFeatureSectionClass()}
    >
      <div className={CURSOR_FEATURE_INNER}>
        <div className={cursorFeatureGridClass(flip)}>
          <MarketingStoryCopy
            className="story-copy"
            alignEnd={flip}
            act={act}
            label={label}
            title={title}
            titleAccent={titleAccent}
            lead={lead}
            points={points}
            scene={scene}
            scrollProgress={scrollProgress}
          />

          <MarketingStoryTimeline
            scene={scene}
            progress={scrollProgress ?? 0}
            className="story-timeline max-md:hidden"
          />

          <div ref={demoRef} className="demo-app-mock w-full">
            <MarketingChatOrchestrationDemo
              scene={scene}
              variant="story"
              sectionRef={sectionRef}
              scrollProgress={scrollProgress}
              autoPlayInView={isMobile && !reduced}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
