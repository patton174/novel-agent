import { css } from 'styled-components'
import { editorTheme } from './theme'

/** 聊天助手消息内：编排、思考、正文共用的卡片表面 */
export const chatMessageSurfaceCss = css`
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border-radius: ${editorTheme.radiusMd};
  background: ${editorTheme.bgElevated};
  border: 1px solid ${editorTheme.border};
  box-shadow: ${editorTheme.shadowInSoft};
`

export const chatMessageSurfacePadding = css`
  padding: 0.55rem 0.7rem 0.65rem;
`
