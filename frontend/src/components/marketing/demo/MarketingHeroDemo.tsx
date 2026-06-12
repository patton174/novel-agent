import { MarketingChatOrchestrationDemo } from './MarketingChatOrchestrationDemo'
import styled from 'styled-components'

const Wrap = styled.div`
  width: 100%;
  margin: 0 auto;
  padding: 0;
`

/** 首屏：聊天流式编排循环演示 */
export function MarketingHeroDemo() {
  return (
    <Wrap aria-label="Agent 流式编排演示">
      <MarketingChatOrchestrationDemo scene="orchestrate" variant="hero" />
    </Wrap>
  )
}
