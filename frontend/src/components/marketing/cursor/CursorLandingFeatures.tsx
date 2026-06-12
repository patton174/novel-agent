import { useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  CURSOR_FEATURE_BODY,
  CURSOR_FEATURE_CARD,
  CURSOR_FEATURE_INNER,
  CURSOR_FEATURE_LINK,
  CURSOR_FEATURE_PIN,
  CURSOR_FEATURE_SECTION,
  CURSOR_FEATURE_TITLE,
  CURSOR_LANDING_ROOT,
  cursorFeatureCopyClass,
  cursorFeatureGridClass,
} from '@/lib/cursorLandingClasses'
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
    <section id={id} className={cn(CURSOR_FEATURE_SECTION, 'cursor-feature-section')}>
      <div className={cn(CURSOR_FEATURE_PIN, 'cursor-feature-pin story-pin')}>
        <div className={CURSOR_FEATURE_INNER}>
          <div className={cursorFeatureGridClass()}>
            <div className={cn(cursorFeatureCopyClass(), 'story-copy cursor-feature-copy')}>
              <h3 className={CURSOR_FEATURE_TITLE}>{title}</h3>
              <p className={CURSOR_FEATURE_BODY}>{body}</p>
              <span className={CURSOR_FEATURE_LINK}>{link}</span>
            </div>
            <div className={cn(CURSOR_FEATURE_CARD, 'cursor-feature-card demo-app-mock')}>
              <NovelCursorMock variant={variant} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function CursorLandingFeatures() {
  const rootRef = useRef<HTMLDivElement>(null)
  useCursorFeatureScroll(rootRef)

  return (
    <div ref={rootRef} className={CURSOR_LANDING_ROOT} data-scroll-story>
      {FEATURES.map((f) => (
        <FeatureBlock key={f.id} {...f} />
      ))}
    </div>
  )
}
