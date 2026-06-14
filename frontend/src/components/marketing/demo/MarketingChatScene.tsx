import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MarketingChatOrchestrationDemo } from './MarketingChatOrchestrationDemo'
import type { MarketingSceneId } from '../../../utils/marketing/buildMarketingSceneDemo'
import { MarketingStoryCopy, type StoryPoint } from '../story/MarketingStoryCopy'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { marketingInViewMotion } from '../motion/marketingInViewMotion'
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
  /** 中间幕轻背景，增强节奏感 */
  wash?: boolean
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
  wash = false,
}: MarketingChatSceneProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const flip = layout === 'copy-right'
  const reduced = useReducedMotion()
  const isMobile = useAppMobile()
  const demoReveal = marketingInViewMotion({
    isMobile,
    reduced: Boolean(reduced),
    desktopInitial: { opacity: 0, y: 20 },
    desktopWhileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-8% 0px', amount: 0.25 },
    transition: { duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] },
  })

  const demo = (
    <MarketingChatOrchestrationDemo scene={scene} variant="story" sectionRef={sectionRef} />
  )

  return (
    <section
      ref={sectionRef}
      id={id}
      data-marketing-scene={scene}
      className={cursorFeatureSectionClass(wash)}
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
          />

          <motion.div className="demo-app-mock" {...demoReveal}>
            {demo}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
