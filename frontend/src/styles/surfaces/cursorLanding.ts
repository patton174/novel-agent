import styled, { css, keyframes } from 'styled-components'
import { font } from '../theme'
import { textStyle } from '../typography'

/** Cursor 官网近似色板 */
export const cursorTheme = {
  bg: '#f8fafc',
  card: '#ffffff',
  cardElevated: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  accent: '#4f46e5',
  accentHover: '#4338ca',
  accentText: '#ffffff',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  green: '#10b981',
  greenBg: 'rgba(16, 185, 129, 0.12)',
  red: '#ef4444',
  redBg: 'rgba(239, 68, 68, 0.1)',
  blue: '#3b82f6',
  blueBg: 'rgba(59, 130, 246, 0.12)',
  shadow:
    '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  shadowSm: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
} as const

const pulse = keyframes`
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
`

export const CursorLandingRoot = styled.div`
  width: 100%;
  background: ${cursorTheme.bg};
`

export const CursorFeatureSection = styled.section`
  position: relative;
  width: 100%;
  padding: 5rem 1.5rem;
  scroll-margin-top: 72px;
`

export const CursorFeatureInner = styled.div`
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
`

export const CursorFeatureGrid = styled.div<{ $flip?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 2.5rem 3rem;
  align-items: center;

  ${({ $flip }) =>
    $flip &&
    css`
      @media (min-width: 901px) {
        .story-copy {
          order: 2;
        }
        .demo-app-mock {
          order: 1;
        }
      }
    `}

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 2rem;

    .story-copy,
    .demo-app-mock {
      order: unset;
    }
  }
`

export const CursorFeatureTag = styled.span`
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${cursorTheme.textMuted};
  margin-bottom: 0.65rem;
`

export const CursorFeatureCopy = styled.div<{ $alignEnd?: boolean }>`
  padding-top: 1.5rem;

  ${({ $alignEnd }) =>
    $alignEnd &&
    css`
      @media (min-width: 901px) {
        padding-top: 1.5rem;
        text-align: right;

        & > p {
          margin-left: auto;
        }
      }
    `}

  @media (max-width: 900px) {
    padding-top: 0;
    text-align: center;

    & > p {
      margin-left: auto;
      margin-right: auto;
    }
  }
`

export const CursorFeatureTitle = styled.h3`
  margin: 0 0 1rem;
  font-family: ${font.display};
  font-size: clamp(1.65rem, 3.2vw, 2.35rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: ${cursorTheme.text};
`

export const CursorFeatureBody = styled.p`
  margin: 0 0 1.25rem;
  font-size: 1rem;
  line-height: 1.65;
  color: ${cursorTheme.textMuted};
  max-width: 22rem;

  @media (max-width: 900px) {
    margin-left: auto;
    margin-right: auto;
  }
`

export const CursorFeatureLink = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.92rem;
  font-weight: 500;
  color: ${cursorTheme.text};
  cursor: default;

  &::after {
    content: '→';
    transition: transform 0.2s ease;
  }

  &:hover::after {
    transform: translateX(3px);
  }
`

export const CursorFeaturePin = styled.div`
  width: 100%;
  min-height: calc(100vh - 72px);
  display: flex;
  align-items: center;
  justify-content: center;
`

export const CursorFeatureCard = styled.div`
  width: 100%;
  min-height: 420px;
  border-radius: 14px;
  background: ${cursorTheme.card};
  border: 1px solid ${cursorTheme.border};
  box-shadow: ${cursorTheme.shadowSm};
  overflow: hidden;
  position: relative;
`

export const CursorHeroStackWrap = styled.div`
  position: relative;
  width: 100%;
  max-width: 1060px;
  margin: 2.5rem auto 0;
  height: clamp(420px, 52vw, 560px);

  @media (max-width: 767px) {
    height: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
`

export const CursorHeroLayer = styled.div<{ $layer: 'back' | 'mid' | 'front' }>`
  position: absolute;

  ${({ $layer }) =>
    $layer === 'back' &&
    css`
      width: 58%;
      left: 4%;
      top: 8%;
      z-index: 1;
      transform: rotate(-1deg);
    `}
  ${({ $layer }) =>
    $layer === 'mid' &&
    css`
      width: 42%;
      right: 2%;
      top: 0;
      z-index: 2;
      transform: rotate(1.5deg);
    `}
  ${({ $layer }) =>
    $layer === 'front' &&
    css`
      width: 38%;
      right: 8%;
      bottom: 0;
      z-index: 3;
      transform: rotate(-0.5deg);
    `}

  @media (max-width: 767px) {
    position: relative;
    width: 100% !important;
    left: auto !important;
    right: auto !important;
    top: auto !important;
    bottom: auto !important;
    transform: none !important;
  }
`

export const CursorWin = styled.div<{ $layer?: 'back' | 'mid' | 'front' }>`
  position: absolute;
  border-radius: 12px;
  background: ${cursorTheme.cardElevated};
  border: 1px solid ${cursorTheme.border};
  box-shadow: ${cursorTheme.shadow};
  overflow: hidden;
  display: flex;
  flex-direction: column;

  ${({ $layer }) =>
    $layer === 'back' &&
    css`
      width: 58%;
      left: 4%;
      top: 8%;
      z-index: 1;
      transform: rotate(-1deg);
    `}
  ${({ $layer }) =>
    $layer === 'mid' &&
    css`
      width: 42%;
      right: 2%;
      top: 0;
      z-index: 2;
      transform: rotate(1.5deg);
    `}
  ${({ $layer }) =>
    $layer === 'front' &&
    css`
      width: 38%;
      right: 8%;
      bottom: 0;
      z-index: 3;
      transform: rotate(-0.5deg);
    `}

  @media (max-width: 767px) {
    width: 92% !important;
    left: 4% !important;
    right: auto !important;
    position: relative;
    transform: none !important;
    margin-bottom: 1rem;

    &:not(:last-child) {
      margin-bottom: 1rem;
    }
  }
`

export const CursorWinBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid ${cursorTheme.border};
  background: linear-gradient(180deg, #fafaf8 0%, #f4f4f1 100%);
  flex-shrink: 0;

  .dots {
    display: flex;
    gap: 5px;
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
  .r {
    background: #ff5f56;
  }
  .y {
    background: #ffbd2e;
  }
  .g {
    background: #27c93f;
  }

  .title {
    flex: 1;
    text-align: center;
    font-size: 0.68rem;
    font-weight: 600;
    color: ${cursorTheme.textMuted};
    letter-spacing: 0.02em;
  }

  .url {
    font-size: 0.62rem;
    color: ${cursorTheme.textFaint};
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    background: ${cursorTheme.bg};
    border: 1px solid ${cursorTheme.border};
  }
`

export const CursorWinBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
`

export const CursorTaskCol = styled.div`
  width: 38%;
  min-width: 140px;
  border-right: 1px solid ${cursorTheme.border};
  padding: 0.5rem 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  background: #fafaf8;
`

export const CursorTaskBtn = styled.div<{ $state?: 'done' | 'active' | 'idle' }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  width: 100%;
  padding: 0.42rem 0.45rem;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 0.68rem;
  text-align: left;
  color: ${cursorTheme.text};
  background: transparent;
  will-change: opacity, transform;

  .row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
  }

  .name {
    flex: 1;
    font-weight: 500;
    line-height: 1.25;
  }

  .time {
    font-size: 0.6rem;
    color: ${cursorTheme.textFaint};
  }

  .diff {
    font-size: 0.58rem;
    font-family: ${font.mono};
    font-weight: 600;
  }
  .diff .add {
    color: ${cursorTheme.green};
  }
  .diff .del {
    color: ${cursorTheme.red};
  }

  ${({ $state }) =>
    $state === 'active' &&
    css`
      background: ${cursorTheme.cardElevated};
      border-color: ${cursorTheme.border};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    `}
`

export const CursorAgentCol = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: ${cursorTheme.cardElevated};
`

export const CursorAgentScroll = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 0.65rem 0.7rem 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`

export const CursorUserPrompt = styled.div`
  font-size: 0.78rem;
  line-height: 1.5;
  color: ${cursorTheme.text};
  will-change: opacity, transform;
`

export const CursorThinking = styled.div`
  font-size: 0.72rem;
  font-weight: 500;
  color: ${cursorTheme.textMuted};
  display: flex;
  align-items: center;
  gap: 0.35rem;
  will-change: opacity;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${cursorTheme.textMuted};
    animation: ${pulse} 1.2s ease-in-out infinite;
  }
`

export const CursorAgentList = styled.ul`
  margin: 0;
  padding: 0 0 0 1rem;
  list-style: disc;
  font-size: 0.72rem;
  line-height: 1.55;
  color: ${cursorTheme.textMuted};

  li {
    margin-bottom: 0.2rem;
    will-change: opacity, transform;
  }
`

export const CursorAgentNarrative = styled.p`
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.55;
  color: ${cursorTheme.text};
  will-change: opacity, transform;
`

export const CursorFileChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.5rem;
  border-radius: 6px;
  background: ${cursorTheme.bg};
  border: 1px solid ${cursorTheme.border};
  font-size: 0.66rem;
  font-family: ${font.mono};
  will-change: opacity, transform;

  .badge {
    font-size: 0.58rem;
    font-weight: 700;
    padding: 0.1rem 0.25rem;
    border-radius: 3px;
    background: ${cursorTheme.border};
    color: ${cursorTheme.textMuted};
  }

  .add {
    color: ${cursorTheme.green};
    font-weight: 600;
  }
  .del {
    color: ${cursorTheme.red};
    font-weight: 600;
  }
`

export const CursorComposer = styled.div`
  padding: 0.45rem 0.55rem 0.55rem;
  border-top: 1px solid ${cursorTheme.border};
  display: flex;
  align-items: center;
  gap: 0.4rem;

  .input {
    flex: 1;
    font-size: 0.68rem;
    color: ${cursorTheme.textFaint};
    padding: 0.4rem 0.5rem;
    border-radius: 8px;
    border: 1px solid ${cursorTheme.border};
    background: ${cursorTheme.bg};
  }

  .pill {
    font-size: 0.62rem;
    font-weight: 600;
    padding: 0.22rem 0.4rem;
    border-radius: 6px;
    border: 1px solid ${cursorTheme.border};
    color: ${cursorTheme.textMuted};
    white-space: nowrap;
  }

  .send {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: ${cursorTheme.text};
    flex-shrink: 0;
  }
`

export const CursorTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.5rem 0;
  border-bottom: 1px solid ${cursorTheme.border};
  overflow: hidden;
`

export const CursorTab = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.55rem;
  font-size: 0.65rem;
  font-family: ${font.mono};
  border-radius: 6px 6px 0 0;
  color: ${cursorTheme.textMuted};
  border: 1px solid transparent;
  border-bottom: none;
  margin-bottom: -1px;

  ${({ $active }) =>
    $active &&
    css`
      background: ${cursorTheme.cardElevated};
      border-color: ${cursorTheme.border};
      color: ${cursorTheme.text};
      font-weight: 600;
    `}
`

export const CursorDocPane = styled.div`
  flex: 1;
  padding: 0.65rem 0.75rem;
  font-size: 0.72rem;
  line-height: 1.6;
  color: ${cursorTheme.text};
  overflow: hidden;

  h4 {
    margin: 0 0 0.5rem;
    ${textStyle('uiSm')}
    font-weight: 700;
  }

  p {
    margin: 0 0 0.45rem;
    color: ${cursorTheme.textMuted};
  }

  .hl {
    background: ${cursorTheme.blueBg};
    outline: 1px solid rgba(59, 130, 246, 0.25);
    border-radius: 2px;
    padding: 0 2px;
    color: ${cursorTheme.text};
  }
`

export const CursorStatusLine = styled.div`
  font-size: 0.7rem;
  color: ${cursorTheme.textMuted};
  display: flex;
  align-items: center;
  gap: 0.4rem;
  will-change: opacity, transform;

  .ok {
    color: ${cursorTheme.green};
    font-weight: 600;
  }
`

export const CursorSummaryCard = styled.div`
  padding: 0.55rem 0.6rem;
  border-radius: 8px;
  background: ${cursorTheme.bg};
  border: 1px solid ${cursorTheme.border};
  will-change: opacity, transform;

  .label {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${cursorTheme.textFaint};
    margin-bottom: 0.35rem;
  }

  .text {
    font-size: 0.72rem;
    line-height: 1.5;
    color: ${cursorTheme.textMuted};
  }
`
