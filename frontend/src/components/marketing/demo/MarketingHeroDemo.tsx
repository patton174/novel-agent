import { MarketingChatOrchestrationDemo } from './MarketingChatOrchestrationDemo'
import styled from 'styled-components'

const Wrap = styled.div`
  width: 100%;
  margin: 2.5rem auto 0;
  padding: 0 0.5rem;
`

/** 首屏：聊天流式编排循环演示 */
export function MarketingHeroDemo() {
  return (
    <Wrap aria-label="Agent 流式编排演示">
      <MarketingChatOrchestrationDemo scene="orchestrate" variant="hero" />
    </Wrap>
  )
}
