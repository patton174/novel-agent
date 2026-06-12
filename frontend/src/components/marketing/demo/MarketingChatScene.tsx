import { useRef } from 'react'
import { MarketingChatOrchestrationDemo } from './MarketingChatOrchestrationDemo'
import type { MarketingSceneId } from '../../../utils/marketing/buildMarketingSceneDemo'
import { MarketingStoryCopy, type StoryPoint } from '../story/MarketingStoryCopy'
import {
  CursorFeatureGrid,
  CursorFeatureInner,
  CursorFeatureSection,
} from '../../../styles/surfaces/cursorLanding'
import styled, { css } from 'styled-components'

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

const SceneSection = styled(CursorFeatureSection)<{ $wash?: boolean }>`
  ${({ $wash }) =>
    $wash &&
    css`
      background: linear-gradient(
        180deg,
        rgba(79, 70, 229, 0.04) 0%,
        rgba(248, 250, 252, 0) 72%
      );
    `}
`

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

  return (
    <SceneSection ref={sectionRef} id={id} data-marketing-scene={scene} $wash={wash}>
      <CursorFeatureInner>
        <CursorFeatureGrid $flip={flip}>
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

          <MarketingChatOrchestrationDemo
            scene={scene}
            variant="story"
            sectionRef={sectionRef}
          />
        </CursorFeatureGrid>
      </CursorFeatureInner>
    </SceneSection>
  )
}
