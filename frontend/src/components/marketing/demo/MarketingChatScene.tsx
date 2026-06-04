import { useRef } from 'react'
import { MarketingChatOrchestrationDemo } from './MarketingChatOrchestrationDemo'
import type { MarketingSceneId } from '../../../utils/marketing/buildMarketingSceneDemo'
import {
  CursorFeatureBody,
  CursorFeatureCopy,
  CursorFeatureGrid,
  CursorFeatureInner,
  CursorFeatureSection,
  CursorFeatureTag,
  CursorFeatureTitle,
} from '../../../styles/surfaces/cursorLanding'

export type MarketingSceneLayout = 'copy-left' | 'copy-right'

export interface MarketingChatSceneProps {
  scene: MarketingSceneId
  id: string
  layout: MarketingSceneLayout
  tag: string
  title: string
  body: string
}

export function MarketingChatScene({
  scene,
  id,
  layout,
  tag,
  title,
  body,
}: MarketingChatSceneProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const flip = layout === 'copy-right'

  return (
    <CursorFeatureSection ref={sectionRef} id={id} data-marketing-scene={scene}>
      <CursorFeatureInner>
        <CursorFeatureGrid $flip={flip}>
          <CursorFeatureCopy className="story-copy" $alignEnd={flip}>
            <CursorFeatureTag>{tag}</CursorFeatureTag>
            <CursorFeatureTitle>{title}</CursorFeatureTitle>
            <CursorFeatureBody>{body}</CursorFeatureBody>
          </CursorFeatureCopy>

          <MarketingChatOrchestrationDemo
            scene={scene}
            variant="story"
            sectionRef={sectionRef}
          />
        </CursorFeatureGrid>
      </CursorFeatureInner>
    </CursorFeatureSection>
  )
}
