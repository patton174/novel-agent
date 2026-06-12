import { useRef } from 'react'
import { MarketingChatScene } from '../demo/MarketingChatScene'
import { useMarketingStoryReveal } from './useMarketingStoryReveal'
import { CursorLandingRoot } from '../../../styles/surfaces/cursorLanding'

/** 三幕分镜：读懂上下文 → 子助手并行 → 流式成稿 */
export function HomeScrollStory() {
  const rootRef = useRef<HTMLDivElement>(null)
  useMarketingStoryReveal(rootRef)

  return (
    <CursorLandingRoot ref={rootRef} data-scroll-story>
      <MarketingChatScene
        id="story-context"
        scene="orchestrate"
        layout="copy-left"
        act="01"
        label="读懂上下文"
        title="续写之前，"
        titleAccent="先对齐你的故事"
        lead="思考、设定与上一章一次就位——编排过程透明可见，不靠猜。"
        points={[
          { highlight: '思考可见', text: '推演节奏与伏笔，不挤占正文区' },
          { highlight: '上下文对齐', text: '角色设定与上一章结尾同步加载' },
          { highlight: '步骤可追溯', text: '每步状态清晰，长程创作不跑偏' },
        ]}
      />

      <MarketingChatScene
        id="story-subagent"
        scene="subagent"
        layout="copy-right"
        wash
        act="02"
        label="子助手并行"
        title="复杂任务，"
        titleAccent="拆给子助手去做"
        lead="主对话保持清爽，专项工作放进独立面板，做完再汇总回来。"
        points={[
          { highlight: '主会话不刷屏', text: '校对、检索类任务单独跑' },
          { highlight: '并行更高效', text: '多线处理，不用来回切窗口' },
          { highlight: '结果自动回写', text: '摘要合并进记忆，续写更稳' },
        ]}
      />

      <MarketingChatScene
        id="story-stream"
        scene="stream"
        layout="copy-left"
        act="03"
        label="流式成稿"
        title="正文实时"
        titleAccent="流入编辑器"
        lead="字句逐行生长，所见即所得；写到哪改到哪，成稿后自动沉淀。"
        points={[
          { highlight: '低延迟输出', text: '边生成边阅读，节奏跟得上' },
          { highlight: '随时可介入', text: '暂停、追问、改写都在同屏完成' },
          { highlight: '成稿即入库', text: '章节与记忆同步更新' },
        ]}
      />
    </CursorLandingRoot>
  )
}
