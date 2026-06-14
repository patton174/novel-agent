import { useRef } from 'react'
import { MarketingChatOrchestrationDemo } from './MarketingChatOrchestrationDemo'
import type { MarketingSceneId } from '../../../utils/marketing/buildMarketingSceneDemo'
import { MarketingStoryCopy, type StoryPoint } from '../story/MarketingStoryCopy'
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
  const flip = layout === 'copy-right'

  const demo = (
    <MarketingChatOrchestrationDemo scene={scene} variant="story" sectionRef={sectionRef} />
  )

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
          />

          <div className="demo-app-mock w-full">{demo}</div>
        </div>
      </div>
    </section>
  )
}
