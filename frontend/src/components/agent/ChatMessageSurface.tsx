import styled from 'styled-components'
import { chatMessageSurfaceCss, chatMessageSurfacePadding } from '../../styles/chatMessageSurface'

/** 与编排时间线一致的圆角卡片容器 */
export const ChatMessageSurface = styled.div`
  ${chatMessageSurfaceCss}
`

/** 正文 / 加载占位等需要内边距的内容区 */
export const ChatMessageSurfaceBody = styled(ChatMessageSurface)`
  ${chatMessageSurfacePadding}
`
