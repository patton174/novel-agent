import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { MarketingEditorAppDemo } from '../demo/MarketingEditorAppDemo'
import {
  STORY_PIN,
  STORY_SCENE,
  STORY_SCENE_BODY,
  STORY_SCENE_COPY,
  STORY_SCENE_INNER,
  STORY_SCENE_LIST,
  STORY_SCENE_TAG,
  STORY_SCENE_TITLE,
  STORY_VISUAL_STAGE,
} from '@/lib/marketingScrollClasses'

type SceneCopyData = {
  tag: string
  title: string
  body: string
  bullets: string[]
}

function SceneCopy({
  tag,
  title,
  body,
  bullets,
}: SceneCopyData) {
  return (
    <div className={cn(STORY_SCENE_COPY, 'story-copy')}>
      <span className={STORY_SCENE_TAG}>{tag}</span>
      <h2 className={STORY_SCENE_TITLE}>{title}</h2>
      <p className={STORY_SCENE_BODY}>{body}</p>
      <ul className={STORY_SCENE_LIST}>
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function useStorySceneCopy(scene: 'think' | 'orchestrate' | 'subagent' | 'stream'): SceneCopyData {
  const { t } = useTranslation('marketing')
  return useMemo(() => {
    const data = t(`demo.storyScenes.${scene}`, { returnObjects: true }) as SceneCopyData
    return data
  }, [t, scene])
}

/** 第一幕：思维链滚动书写 */
export function ThinkScene() {
  const copy = useStorySceneCopy('think')

  return (
    <section id="story-think" className={STORY_SCENE}>
      <div className={cn(STORY_PIN, 'story-pin')}>
        <div className={STORY_SCENE_INNER}>
          <SceneCopy {...copy} />
          <div className={cn(STORY_VISUAL_STAGE, 'story-visual')}>
            <MarketingEditorAppDemo variant="think" />
          </div>
        </div>
      </div>
    </section>
  )
}

/** 第二幕：编排与工具链 */
export function OrchestrationScene() {
  const copy = useStorySceneCopy('orchestrate')

  return (
    <section id="story-orchestrate" className={STORY_SCENE}>
      <div className={cn(STORY_PIN, 'story-pin')}>
        <div className={STORY_SCENE_INNER}>
          <SceneCopy {...copy} />
          <div className={cn(STORY_VISUAL_STAGE, 'story-visual')}>
            <MarketingEditorAppDemo variant="orchestrate" />
          </div>
        </div>
      </div>
    </section>
  )
}

/** 第三幕：子代理 */
export function SubagentScene() {
  const copy = useStorySceneCopy('subagent')

  return (
    <section id="story-subagent" className={STORY_SCENE}>
      <div className={cn(STORY_PIN, 'story-pin')}>
        <div className={STORY_SCENE_INNER}>
          <SceneCopy {...copy} />
          <div className={cn(STORY_VISUAL_STAGE, 'story-visual')}>
            <MarketingEditorAppDemo variant="subagent" />
          </div>
        </div>
      </div>
    </section>
  )
}

/** 第四幕：流式成稿 */
export function StreamScene() {
  const copy = useStorySceneCopy('stream')

  return (
    <section id="story-stream" className={STORY_SCENE}>
      <div className={cn(STORY_PIN, 'story-pin')}>
        <div className={STORY_SCENE_INNER}>
          <SceneCopy {...copy} />
          <div className={cn(STORY_VISUAL_STAGE, 'story-visual')}>
            <MarketingEditorAppDemo variant="stream" />
          </div>
        </div>
      </div>
    </section>
  )
}
