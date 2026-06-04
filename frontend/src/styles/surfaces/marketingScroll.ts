import styled, { keyframes } from 'styled-components'
import { cursorTheme } from './cursorLanding'
import { font, palette, radius, shadow, transition } from '../theme'
import { textStyle } from '../typography'

const storyScrubPulse = keyframes`
  0%,
  100% {
    opacity: 0.45;
    transform: scaleX(0.35);
  }
  50% {
    opacity: 1;
    transform: scaleX(1);
  }
`

export const StoryScrollRoot = styled.div`
  position: relative;
  width: 100%;

  &::before {
    content: '滚动驱动演示';
    position: sticky;
    top: 76px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
    display: block;
    width: fit-content;
    margin: 0 auto 0.5rem;
    padding: 0.28rem 0.75rem;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${palette.accentDark};
    background: ${palette.surfaceAlpha};
    border: 1px solid ${palette.border};
    border-radius: ${radius.round};
    backdrop-filter: blur(8px);
    pointer-events: none;
  }

  &::after {
    content: '';
    display: block;
    width: 120px;
    height: 3px;
    margin: -0.15rem auto 1.25rem;
    border-radius: 3px;
    background: linear-gradient(90deg, transparent, ${palette.accent}, transparent);
    transform-origin: center;
    animation: ${storyScrubPulse} 2.2s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before,
    &::after {
      display: none;
    }
  }
`

export const StoryScene = styled.section`
  position: relative;
  width: 100%;
  min-height: 100vh;
  scroll-margin-top: 72px;
`

export const StoryPin = styled.div`
  width: 100%;
  min-height: calc(100vh - 72px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  will-change: transform;
`

export const StorySceneInner = styled.div`
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.15fr);
  gap: 2.5rem;
  align-items: center;
  pointer-events: auto;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }
`

export const StorySceneCopy = styled.div`
  z-index: 2;
`

export const StorySceneTag = styled.span`
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${palette.accentDark};
  margin-bottom: 0.75rem;
`

export const StorySceneTitle = styled.h2`
  ${textStyle('h2')}
  color: ${palette.text};
  margin: 0 0 1rem;
`

export const StorySceneBody = styled.p`
  ${textStyle('body')}
  color: ${palette.textSubtle};
  margin: 0 0 1.25rem;
  line-height: 1.75;
  max-width: 28rem;
`

export const StorySceneList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  li {
    font-size: 0.9rem;
    color: ${palette.textSecondary};
    padding-left: 1.1rem;
    position: relative;
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.55em;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${palette.accent};
    }
  }
`

export const StoryVisualStage = styled.div`
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
`

export const StoryBookPanel = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform, opacity;
`

export const FloatingWord = styled.span<{ $x: number; $y: number; $rotate: number }>`
  position: absolute;
  left: ${({ $x }) => $x}%;
  top: ${({ $y }) => $y}%;
  font-family: ${font.display};
  font-size: clamp(0.85rem, 1.6vw, 1.15rem);
  font-weight: 600;
  color: ${palette.text};
  transform: rotate(${({ $rotate }) => $rotate}deg);
  white-space: nowrap;
  pointer-events: none;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
  will-change: transform, opacity, left, top;
`

export const StoryBookFrame = styled.div`
  width: min(100%, 420px);
  aspect-ratio: 4 / 5;
  border-radius: ${radius.lg};
  background: linear-gradient(160deg, #fafafa 0%, ${palette.bgSidebar} 100%);
  box-shadow: ${shadow.cardHero};
  border: 1px solid rgba(255, 255, 255, 0.7);
  padding: 1.5rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`

export const StoryBookLine = styled.div<{ $width: string }>`
  height: 10px;
  border-radius: 6px;
  width: ${({ $width }) => $width};
  background: ${palette.bgInset};
  will-change: transform, opacity;
`

export const StoryBookAccent = styled.div`
  height: 14px;
  border-radius: 6px;
  width: 72%;
  background: linear-gradient(90deg, ${palette.accentSoft}, ${palette.accent});
  margin-top: 0.25rem;
  will-change: transform, opacity;
`

export const MemoryNode = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  left: ${({ $x }) => $x}%;
  top: ${({ $y }) => $y}%;
  transform: translate(-50%, -50%);
  padding: 0.45rem 0.7rem;
  border-radius: ${radius.md};
  font-size: 0.72rem;
  font-weight: 600;
  background: ${palette.bg};
  color: ${palette.textSecondary};
  box-shadow: ${shadow.outSm};
  border: 1px solid ${palette.border};
  will-change: transform, opacity;
`

export const MemoryLink = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`

export const PipelineStep = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.9rem;
  border-radius: ${radius.md};
  background: ${palette.bg};
  box-shadow: ${shadow.outSm};
  border: 1px solid ${palette.border};
  font-size: 0.82rem;
  font-weight: 600;
  color: ${palette.text};
  will-change: transform, opacity;

  .step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${palette.textFaint};
    flex-shrink: 0;
  }
`

export const PipelineWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  width: min(100%, 320px);
`

export const ScrollProgressRail = styled.aside`
  position: fixed;
  right: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.45rem;
  border-radius: ${radius.xl};
  background: ${palette.surfaceAlpha};
  backdrop-filter: blur(10px);
  box-shadow: ${shadow.outSm};
  border: 1px solid ${palette.border};

  @media (max-width: 900px) {
    display: none;
  }
`

export const ScrollProgressTrack = styled.div`
  width: 3px;
  height: 120px;
  border-radius: 3px;
  background: ${palette.bgInset};
  overflow: hidden;
  position: relative;
`

export const ScrollProgressFill = styled.div<{ $progress: number }>`
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: ${({ $progress }) => $progress * 100}%;
  background: linear-gradient(180deg, ${palette.accent}, ${palette.accentDeep});
  border-radius: 3px;
  transition: height 0.12s ${transition.fast};
`

export const ScrollChapterDot = styled.button<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: ${({ $active }) => ($active ? palette.accent : palette.textFaint)};
  opacity: ${({ $active }) => ($active ? 1 : 0.45)};
  transition:
    transform ${transition.fast},
    background ${transition.fast},
    opacity ${transition.fast};

  &:hover {
    transform: scale(1.2);
    opacity: 1;
  }
`

export const CapabilitiesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;

  & > div {
    height: 100%;
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

export const CapabilityCard = styled.article`
  padding: 1.35rem 1.25rem;
  border-radius: 12px;
  background: ${cursorTheme.cardElevated};
  box-shadow: ${cursorTheme.shadowSm};
  border: 1px solid ${cursorTheme.border};
  transition:
    transform ${transition.base},
    box-shadow ${transition.base};

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${cursorTheme.shadow};
  }

  h3 {
    ${textStyle('h3')}
    margin: 0 0 0.45rem;
    color: ${cursorTheme.text};
    font-size: 1.05rem;
  }

  p {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.55;
    color: ${cursorTheme.textMuted};
  }

  .cap-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.85rem;
    font-size: 1.25rem;
  }
`

const scrollHintBounce = keyframes`
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  50% {
    transform: translateY(6px);
    opacity: 1;
  }
`

export const HeroScrollHint = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1.5rem;
  font-size: 0.75rem;
  color: ${palette.textMuted};
  letter-spacing: 0.08em;

  .chevron {
    animation: ${scrollHintBounce} 2s ease-in-out infinite;
    color: ${palette.accent};
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron {
      animation: none;
    }
  }
`

