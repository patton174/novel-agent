import { MarketingChatOrchestrationDemo } from './MarketingChatOrchestrationDemo'

/** 首屏：聊天流式编排循环演示 */
export function MarketingHeroDemo() {
  return (
    <div className="w-full">
      <MarketingChatOrchestrationDemo scene="orchestrate" variant="hero" />
    </div>
  )
}
