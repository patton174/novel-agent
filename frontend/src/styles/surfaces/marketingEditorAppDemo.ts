import styled, { css, keyframes } from 'styled-components'
import { editorTheme } from '../editorTheme'
import { font, palette, radius, shadow } from '../theme'
import { textStyle } from '../typography'

const urlShimmer = keyframes`
  0% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.55;
  }
`

const livePulse = keyframes`
  0%,
  100% {
    box-shadow: 0 0 0 rgba(79, 70, 229, 0);
  }
  50% {
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
  }
`

export const AppMockRoot = styled.div`
  width: min(100%, 920px);
  margin: 0 auto;
  border-radius: ${radius.xl};
  overflow: hidden;
  background: ${editorTheme.bg};
  border: 1px solid ${editorTheme.borderStrong};
  box-shadow:
    ${shadow.window},
    0 24px 64px rgba(0, 0, 0, 0.12);
  transform-style: preserve-3d;
  will-change: transform, opacity;

  @media (max-width: 640px) {
    border-radius: ${radius.lg};
    font-size: 0.94em;
  }
`

export const AppBrowserBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.85rem;
  background: linear-gradient(180deg, #f6f6f6 0%, #ececec 100%);
  border-bottom: 1px solid ${editorTheme.border};

  .traffic {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .red {
    background: #ff5f56;
  }
  .yellow {
    background: #ffbd2e;
  }
  .green {
    background: #27c93f;
  }

  .title {
    font-size: 0.72rem;
    font-weight: 600;
    color: ${editorTheme.textSecondary};
    white-space: nowrap;
  }

  .url {
    flex: 1;
    min-width: 0;
    font-size: 0.68rem;
    color: ${editorTheme.textMuted};
    background: ${palette.bg};
    border: 1px solid ${editorTheme.border};
    border-radius: ${radius.sm};
    padding: 0.28rem 0.55rem;
    animation: ${urlShimmer} 3s ease-in-out infinite;
  }

  .live {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${palette.success};
    padding: 0.2rem 0.45rem;
    border-radius: ${radius.sm};
    background: rgba(127, 186, 0, 0.12);
    flex-shrink: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .url {
      animation: none;
    }
  }

  @media (max-width: 640px) {
    padding: 0.45rem 0.55rem;
    gap: 0.45rem;

    .url,
    .live {
      display: none;
    }
  }
`

export const AppWorkspace = styled.div`
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr) minmax(0, 1.05fr);
  min-height: 380px;
  max-height: 420px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    max-height: none;
    min-height: 300px;
  }

  @media (max-width: 640px) {
    min-height: 260px;
  }
`

export const AppSidebar = styled.aside`
  background: ${editorTheme.bgSidebar};
  border-right: 1px solid ${editorTheme.border};
  padding: 0.65rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;

  @media (max-width: 820px) {
    display: none;
  }
`

export const AppSidebarNovel = styled.div`
  padding: 0.35rem 0.4rem 0.5rem;
  border-bottom: 1px solid ${editorTheme.border};

  .name {
    ${textStyle('uiSm')}
    font-weight: 700;
    color: ${editorTheme.text};
    line-height: 1.3;
  }

  .meta {
    margin-top: 0.2rem;
    font-size: 0.65rem;
    color: ${editorTheme.textMuted};
  }
`

export const AppChapterItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.45rem;
  border-radius: ${radius.md};
  font-size: 0.72rem;
  color: ${editorTheme.textSecondary};
  will-change: opacity, transform;

  .idx {
    font-size: 0.62rem;
    color: ${editorTheme.textMuted};
    width: 1.1rem;
    flex-shrink: 0;
  }

  ${({ $active }) =>
    $active &&
    css`
      background: ${palette.activeBg};
      color: ${editorTheme.text};
      font-weight: 600;
      animation: ${livePulse} 2.4s ease-in-out infinite;

      .idx {
        color: ${palette.accentDark};
      }
    `}
`

export const AppEditorPane = styled.main`
  border-right: 1px solid ${editorTheme.border};
  padding: 0.75rem 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  background: ${palette.bg};
  overflow: hidden;

  @media (max-width: 640px) {
    display: none;
  }
`

export const AppEditorTitle = styled.h3`
  margin: 0;
  ${textStyle('uiSm')}
  font-weight: 700;
  color: ${editorTheme.text};
`

export const AppEditorBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  overflow: hidden;
`

export const AppEditorLine = styled.p`
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.7;
  color: ${palette.textBody};
  will-change: opacity, transform, clip-path;

  &.muted {
    color: ${editorTheme.textMuted};
    font-size: 0.74rem;
  }

  &.stream {
    font-family: ${font.mono};
    color: ${palette.accent};
  }
`

export const AppAgentPane = styled.aside`
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: ${editorTheme.bgElevated};
`

export const AppAgentTop = styled.div`
  padding: 0.55rem 0.65rem;
  border-bottom: 1px solid ${editorTheme.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;

  .session {
    ${textStyle('uiSm')}
    font-weight: 600;
    color: ${editorTheme.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .model {
    font-size: 0.62rem;
    font-weight: 600;
    color: ${editorTheme.textMuted};
    padding: 0.18rem 0.4rem;
    border-radius: ${radius.sm};
    border: 1px solid ${editorTheme.border};
    flex-shrink: 0;
  }
`

export const AppAgentScroll = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 0.55rem 0.6rem 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

export const AppUserBubble = styled.div`
  align-self: flex-end;
  max-width: 92%;
  padding: 0.45rem 0.55rem;
  border-radius: ${radius.lg} ${radius.lg} ${radius.sm} ${radius.lg};
  background: ${palette.accentSoft};
  border: 1px solid ${palette.accentBorderLight};
  font-size: 0.78rem;
  line-height: 1.45;
  color: ${editorTheme.text};
  will-change: opacity, transform;
`

export const AppAgentTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-height: 0;
`

export const AppComposerStub = styled.div`
  margin-top: auto;
  padding: 0.45rem 0.55rem 0.55rem;
  border-top: 1px solid ${editorTheme.border};

  .box {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.42rem 0.5rem;
    border-radius: ${radius.lg};
    border: 1px solid ${editorTheme.border};
    background: ${palette.bg};
  }

  .placeholder {
    flex: 1;
    font-size: 0.72rem;
    color: ${editorTheme.textMuted};
  }

  .send {
    width: 28px;
    height: 28px;
    border-radius: ${radius.md};
    background: ${palette.accent};
    flex-shrink: 0;
  }
`
