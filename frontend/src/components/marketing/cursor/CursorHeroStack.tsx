import { CursorHeroLayer, CursorHeroStackWrap } from '../../../styles/surfaces/cursorLanding'
import {
  CursorDesktopMock,
  CursorFloatCardMock,
  CursorPreviewMock,
} from './NovelCursorMock'

/** Hero 区层叠产品窗 — 结构对齐 cursor.com 首屏 */
export function CursorHeroStack() {
  return (
    <CursorHeroStackWrap className="cursor-hero-stack" aria-hidden>
      <CursorHeroLayer $layer="back">
        <CursorDesktopMock variant="hero" />
      </CursorHeroLayer>
      <CursorHeroLayer $layer="mid">
        <CursorPreviewMock />
      </CursorHeroLayer>
      <CursorHeroLayer $layer="front">
        <CursorFloatCardMock />
      </CursorHeroLayer>
    </CursorHeroStackWrap>
  )
}
