import {
  CURSOR_HERO_STACK_WRAP,
  cursorHeroLayerClass,
} from '@/lib/cursorLandingClasses'
import {
  CursorDesktopMock,
  CursorFloatCardMock,
  CursorPreviewMock,
} from './NovelCursorMock'

/** Hero 区层叠产品窗 — 结构对齐 cursor.com 首屏 */
export function CursorHeroStack() {
  return (
    <div className={`${CURSOR_HERO_STACK_WRAP} cursor-hero-stack`} aria-hidden>
      <div className={cursorHeroLayerClass('back')}>
        <CursorDesktopMock variant="hero" />
      </div>
      <div className={cursorHeroLayerClass('mid')}>
        <CursorPreviewMock />
      </div>
      <div className={cursorHeroLayerClass('front')}>
        <CursorFloatCardMock />
      </div>
    </div>
  )
}
