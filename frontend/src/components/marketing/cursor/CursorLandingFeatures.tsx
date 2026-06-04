import { useRef } from 'react'
import {
  CursorFeatureBody,
  CursorFeatureCard,
  CursorFeatureCopy,
  CursorFeatureGrid,
  CursorFeatureInner,
  CursorFeatureLink,
  CursorFeaturePin,
  CursorFeatureSection,
  CursorFeatureTitle,
  CursorLandingRoot,
} from '../../../styles/surfaces/cursorLanding'
import { NovelCursorMock } from './NovelCursorMock'
import { useCursorFeatureScroll } from '../scroll/useCursorFeatureScroll'

const FEATURES = [
  {
    id: 'story-think',
    title: '让 Agent 把灵感写成章节',
    body: '把续写、校对、记忆检索交给 Agent，加快创作速度，而你专注于剧情与人物。',
    link: '了解 Agent 驱动的创作 →',
    variant: 'prd' as const,
  },
  {
    id: 'story-orchestrate',
    title: '自主编排，并行推进',
    body: 'Plan 拆解步骤，memory_read、子代理、chapter_create 在同一面板内并行可见，长任务可托管。',
    link: '了解智能编排 →',
    variant: 'parallel' as const,
  },
  {
    id: 'story-stream',
    title: '流式成稿，所见即所得',
    body: '正文以流式写入编辑器与阅读预览，字句逐行生长；成稿后自动回写章节记忆。',
    link: '了解流式输出 →',
    variant: 'stream' as const,
  },
] as const

function FeatureBlock({
  id,
  title,
  body,
  link,
  variant,
}: (typeof FEATURES)[number]) {
  return (
    <CursorFeatureSection id={id} className="cursor-feature-section">
      <CursorFeaturePin className="cursor-feature-pin story-pin">
        <CursorFeatureInner>
          <CursorFeatureGrid>
            <CursorFeatureCopy className="story-copy cursor-feature-copy">
              <CursorFeatureTitle>{title}</CursorFeatureTitle>
              <CursorFeatureBody>{body}</CursorFeatureBody>
              <CursorFeatureLink>{link}</CursorFeatureLink>
            </CursorFeatureCopy>
            <CursorFeatureCard className="cursor-feature-card demo-app-mock">
              <NovelCursorMock variant={variant} />
            </CursorFeatureCard>
          </CursorFeatureGrid>
        </CursorFeatureInner>
      </CursorFeaturePin>
    </CursorFeatureSection>
  )
}

export function CursorLandingFeatures() {
  const rootRef = useRef<HTMLDivElement>(null)
  useCursorFeatureScroll(rootRef)

  return (
    <CursorLandingRoot ref={rootRef} data-scroll-story>
      {FEATURES.map((f) => (
        <FeatureBlock key={f.id} {...f} />
      ))}
    </CursorLandingRoot>
  )
}
