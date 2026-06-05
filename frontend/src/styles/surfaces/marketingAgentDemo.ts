import styled, { css, keyframes } from 'styled-components'
import { editorTheme } from '../editorTheme'
import { font, palette, radius, shadow } from '../theme'
import { textStyle } from '../typography'

const shimmer = keyframes`
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`

const blink = keyframes`
  50% {
    opacity: 0;
  }
`

const consoleGlow = keyframes`
  0%,
  100% {
    box-shadow:
      ${shadow.window},
      0 0 0 rgba(233, 181, 11, 0);
  }
  50% {
    box-shadow:
      ${shadow.window},
      0 0 32px rgba(233, 181, 11, 0.12);
  }
`

export const DemoAgentConsole = styled.div`
  width: min(100%, 480px);
  border-radius: ${radius.lg};
  background: ${editorTheme.bgElevated};
  border: 1px solid ${editorTheme.border};
  box-shadow: ${shadow.window};
  padding: 0.85rem 0.75rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  text-align: left;
  transform-style: preserve-3d;
  animation: ${consoleGlow} 4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const DemoAgentChrome = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid ${editorTheme.border};
  margin-bottom: 0.15rem;

  .dot {
    width: 9px;
    height: 9px;
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
  .label {
    margin-left: auto;
    font-size: 0.68rem;
    font-weight: 600;
    color: ${editorTheme.textMuted};
    letter-spacing: 0.06em;
  }
`

export const DemoThinkBlock = styled.div<{ $active?: boolean }>`
  border-left: 2px solid ${({ $active }) => ($active ? palette.traceOk : editorTheme.border)};
  padding-left: 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

export const DemoThinkHeader = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 1.35rem;

  .title {
    ${textStyle('uiSm')}
    font-weight: 600;
    color: ${editorTheme.textSecondary};
  }

  .meta {
    font-size: 0.68rem;
    color: ${editorTheme.textMuted};
  }

  ${({ $active }) =>
    $active &&
    css`
      .title {
        background: linear-gradient(
          90deg,
          ${editorTheme.textSecondary} 0%,
          ${palette.accent} 45%,
          ${editorTheme.textSecondary} 90%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: ${shimmer} 2.2s linear infinite;
      }
    `}
`

export const DemoThinkLine = styled.p`
  margin: 0;
  ${textStyle('uiSm')}
  line-height: 1.55;
  color: ${palette.textBody};
  will-change: opacity, transform;
`

export const DemoThinkCursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  background: ${palette.accent};
  vertical-align: text-bottom;
  animation: ${blink} 1s step-end infinite;
  will-change: opacity;
`

export const DemoOrchHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.15rem 0;
  cursor: default;
  text-align: left;

  .chevron {
    width: 0.42rem;
    height: 0.42rem;
    border-right: 1.5px solid ${editorTheme.textMuted};
    border-bottom: 1.5px solid ${editorTheme.textMuted};
    transform: rotate(-135deg);
    flex-shrink: 0;
  }

  .title {
    ${textStyle('uiSm')}
    font-weight: 600;
    color: ${editorTheme.text};
  }
`

export const DemoToolList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  padding-left: 0.2rem;
`

export const DemoToolRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  padding: 0.28rem 0.15rem 0.28rem 0;
  will-change: opacity, transform;

  .lead {
    width: 1.35rem;
    height: 1.35rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .body {
    flex: 1;
    min-width: 0;
  }

  .headline {
    ${textStyle('uiSm')}
    line-height: 1.35;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.4rem;
    align-items: center;
  }

  .name {
    font-weight: 700;
    color: ${editorTheme.text};
  }

  .args {
    color: ${editorTheme.textMuted};
    font-weight: 400;
  }

  .excerpt {
    margin-top: 0.2rem;
    font-size: 0.74rem;
    line-height: 1.45;
    color: ${editorTheme.textMuted};
    padding-left: 0.1rem;
  }
`

export const DemoStatusDot = styled.span<{ $status: 'idle' | 'loading' | 'success' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $status }) =>
    $status === 'success'
      ? palette.traceOk
      : $status === 'loading'
        ? palette.accent
        : palette.textFaint};
  box-shadow: ${({ $status }) =>
    $status === 'loading' ? `0 0 8px ${palette.accentGlow}` : 'none'};
`

export const DemoSubagentWrap = styled.div`
  margin-top: 0.15rem;
  padding: 0.55rem 0.5rem 0.6rem;
  border-radius: ${radius.md};
  background: ${palette.bg};
  border: 1px solid ${palette.accentBorderLight};
  will-change: opacity, transform;

  .sub-head {
    font-size: 0.72rem;
    font-weight: 700;
    color: ${palette.accentDark};
    margin-bottom: 0.45rem;
    letter-spacing: 0.04em;
  }
`

export const DemoStreamBlock = styled.div`
  border-radius: ${radius.md};
  background: ${palette.codeBg};
  padding: 1rem 1rem 1.1rem;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  will-change: opacity, transform;
`

export const DemoStreamLabel = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${palette.success};
`

export const DemoStreamLine = styled.p`
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.75;
  color: ${palette.accent};
  font-family: ${font.mono};
  will-change: opacity, transform;
`

export const DemoStreamCursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 1.1em;
  margin-left: 3px;
  background: ${palette.accent};
  vertical-align: text-bottom;
  animation: ${blink} 0.9s step-end infinite;
`
