import { motion, useReducedMotion } from 'framer-motion'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { marketingInViewMotion } from '../motion/marketingInViewMotion'
import {
  STORY_ACT_INDEX,
  STORY_ACT_LABEL,
  STORY_ACT_ROW,
  STORY_COPY_BLOCK,
  STORY_LEAD,
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
}

export function MarketingStoryCopy({
  act,
  label,
  title,
  titleAccent,
  lead,
  points,
  alignEnd,
  className,
}: MarketingStoryCopyProps) {
  const reduced = useReducedMotion()
  const isMobile = useAppMobile()
  const copyReveal = marketingInViewMotion({
    isMobile,
    reduced: Boolean(reduced),
    desktopInitial: { opacity: 0, y: 24 },
    desktopWhileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-10% 0px', amount: 0.35 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  })

  const inner = (
    <div className={cn(STORY_COPY_BLOCK, 'story-copy-block')}>
      <div className={STORY_ACT_ROW}>
        <span className={STORY_ACT_INDEX}>{act}</span>
        <span className={STORY_ACT_LABEL}>{label}</span>
      </div>
      <h3 className={STORY_TITLE}>
        {title}
        <span className={STORY_TITLE_ACCENT}>{titleAccent}</span>
      </h3>
      <p className={STORY_LEAD}>{lead}</p>
      <ul className={STORY_POINT_LIST}>
        {points.map((point) => (
          <li key={point.highlight} className={STORY_POINT_ITEM}>
            <strong>{point.highlight}</strong> · {point.text}
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className={cn(storyCopyRootClass(alignEnd), className)}>
      <motion.div {...copyReveal}>{inner}</motion.div>
    </div>
  )
}
