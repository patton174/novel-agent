import styled, { css } from 'styled-components'
import { cursorTheme } from './cursorLanding'
import { editorLayout, editorTheme } from '../editorTheme'

export const MarketingEditorSection = styled.section`
  width: 100%;
  padding: 3rem 0 4rem;
  background: ${cursorTheme.bg};
  scroll-margin-top: 72px;
`

export const MarketingEditorHeader = styled.div`
  width: 100%;
  max-width: ${editorLayout.contentMaxWidth};
  margin: 0 auto 1.75rem;
  padding: 0 1.5rem;
  text-align: center;

  h2 {
    margin: 0 0 0.65rem;
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 600;
    letter-spacing: -0.03em;
    color: ${cursorTheme.text};
  }

  p {
    margin: 0;
    font-size: 1rem;
    color: ${cursorTheme.textMuted};
    line-height: 1.6;
  }
`

export const MarketingEditorPin = styled.div`
  width: 100%;
  min-height: 85vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 1rem 2rem;
  box-sizing: border-box;
`

/** 首页分镜：固定高度，避免演示内容增长时撑开页面导致滚动跳动 */
export const MarketingChatDemoFrame = styled.div`
  width: 100%;
  height: min(520px, 62vh);
  transform-origin: top center;
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 20px 48px rgba(0, 0, 0, 0.1);
  border: 1px solid ${editorTheme.borderStrong};
  background: ${editorTheme.bg};
  pointer-events: none;
  user-select: none;
  display: flex;
  flex-direction: column;
  min-height: 0;
  contain: layout style paint;

  ${css`
    /* 移除之前的 padding-bottom */
    section > div > div:first-of-type {
      padding-bottom: 2rem !important;
    }

    [data-testid='chat-composer'] {
      width: 92%;
      max-width: 520px;
      margin: 0 auto;
    }

    [data-testid='chat-composer'] > div:first-child {
      padding: 0.28rem 0.5rem 0.24rem;
      gap: 0.22rem;
      border-radius: 10px;
    }

    [data-testid='chat-composer'] textarea {
      min-height: 28px;
      max-height: 52px;
      font-size: 0.76rem;
      line-height: 1.35;
    }

    [data-testid='chat-composer'] p {
      margin-top: 0.18rem;
      font-size: 0.58rem;
    }
  `}
`
