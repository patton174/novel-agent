import { useRef } from 'react'
import { MarketingChatScene } from '../demo/MarketingChatScene'
import { useMarketingStoryReveal } from './useMarketingStoryReveal'
import { CursorLandingRoot } from '../../../styles/surfaces/cursorLanding'

/** 两幕分镜：编排（记忆+读章）→ 子代理；演示为视口内定时循环 */
export function HomeScrollStory() {
  const rootRef = useRef<HTMLDivElement>(null)
  useMarketingStoryReveal(rootRef)

  return (
    <CursorLandingRoot ref={rootRef} data-scroll-story>
      <MarketingChatScene
        id="story-orchestrate"
        scene="orchestrate"
        layout="copy-left"
        tag="第一幕 · 编排"
        title="先读记忆，再读前一章"
        body="memory_read 与 chapter_read 依次就位，参数与摘要同屏可见——和真实续写前的准备流程一致。"
      />

      <MarketingChatScene
        id="story-subagent"
        scene="subagent"
        layout="copy-right"
        tag="第二幕 · 子代理"
        title="复杂任务拆给子代理"
        body="主会话只保留一条父工具，子代理在嵌套面板里独立完成 memory_read、output，完成后回写摘要。"
      />
    </CursorLandingRoot>
  )
}
