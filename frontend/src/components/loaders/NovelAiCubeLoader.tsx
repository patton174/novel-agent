import styled from 'styled-components'
import { palette } from '../../styles/theme'

const ACCENT = palette.accent
const ACCENT_SOFT = 'rgba(245, 213, 106, 0.55)'
const NEU_SHADOW_IN = 'rgba(0, 0, 0, 0.08)'
const NEU_SHADOW_HI = 'rgba(255, 255, 255, 0.85)'

export interface NovelAiCubeLoaderProps {
  compact?: boolean
  className?: string
}

/**
 * 立方体字母加载动画（配色适配 Novel AI 暖金 / 新拟物主题）
 */
export function NovelAiCubeLoader({ compact = false, className }: NovelAiCubeLoaderProps) {
  const letters = ['L', 'O', 'A', 'D', 'I', 'N', 'G']

  return (
    <StyledWrapper className={className} data-testid="novel-ai-cube-loader">
      <div className="wrapper-grid" data-compact={compact ? 'true' : undefined}>
        {letters.map((letter, i) => (
          <div className="cube" key={i}>
            <div className="face face-front">{letter}</div>
            <div className="face face-back" />
            <div className="face face-right" />
            <div className="face face-left" />
            <div className="face face-top" />
            <div className="face face-bottom" />
          </div>
        ))}
      </div>
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;

  .wrapper-grid {
    --animation-duration: 2.1s;
    --cube-color: rgba(233, 181, 11, 0.06);
    --highlight-color: ${ACCENT};
    --highlight-mid: rgba(233, 181, 11, 0.35);
    --cube-width: 44px;
    --cube-height: 44px;
    --font-size: 1.05rem;

    &[data-compact='true'] {
      --cube-width: 22px;
      --cube-height: 22px;
      --font-size: 0.52rem;
      --animation-duration: 1.85s;
      perspective: 180px;
    }

    position: relative;

    display: grid;
    grid-template-columns: repeat(7, var(--cube-width));
    grid-template-rows: auto;
    gap: 0;

    width: calc(7 * var(--cube-width));
    height: var(--cube-height);
    perspective: 320px;

    font-family: ui-sans-serif, system-ui, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: var(--font-size);
    font-weight: 800;
    color: transparent;
  }

  .cube {
    position: relative;
    transform-style: preserve-3d;
  }

  .face {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--cube-width);
    height: var(--cube-height);
    border-radius: 5px;
    background-color: var(--cube-color);
  }

  .face-left,
  .face-right,
  .face-back,
  .face-front {
    box-shadow:
      inset 0 0 2px 1px ${NEU_SHADOW_IN},
      inset 0 0 10px 1px ${NEU_SHADOW_HI};
  }

  .face-front {
    transform: rotateY(0deg) translateZ(calc(var(--cube-width) / 2));
    color: ${palette.cubeText};
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
  }

  .face-back {
    transform: rotateY(180deg) translateZ(calc(var(--cube-width) / 2));
    opacity: 0.55;
  }

  .face-left {
    transform: rotateY(-90deg) translateZ(calc(var(--cube-width) / 2));
    opacity: 0.55;
  }

  .face-right {
    transform: rotateY(90deg) translateZ(calc(var(--cube-width) / 2));
    opacity: 0.55;
  }

  .face-top {
    height: var(--cube-width);
    transform: rotateX(90deg) translateZ(calc(var(--cube-width) / 2));
    opacity: 0.75;
  }

  .face-bottom {
    height: var(--cube-width);
    transform: rotateX(-90deg)
      translateZ(calc(var(--cube-height) - var(--cube-width) * 0.5));
    opacity: 0.75;
  }

  .cube:nth-child(1) {
    z-index: 0;
    animation-delay: 0s;
  }
  .cube:nth-child(2) {
    z-index: 1;
    animation-delay: 0.2s;
  }
  .cube:nth-child(3) {
    z-index: 2;
    animation-delay: 0.4s;
  }
  .cube:nth-child(4) {
    z-index: 3;
    animation-delay: 0.6s;
  }
  .cube:nth-child(5) {
    z-index: 2;
    animation-delay: 0.8s;
  }
  .cube:nth-child(6) {
    z-index: 1;
    animation-delay: 1s;
  }
  .cube:nth-child(7) {
    z-index: 0;
    animation-delay: 1.2s;
  }

  .cube {
    animation: novelai-translate-z var(--animation-duration) ease-in-out infinite;
  }

  .cube .face {
    animation:
      novelai-face-color var(--animation-duration) ease-in-out infinite,
      novelai-edge-glow var(--animation-duration) ease-in-out infinite;
    animation-delay: inherit;
  }

  .cube .face.face-front {
    animation:
      novelai-face-color var(--animation-duration) ease-in-out infinite,
      novelai-face-glow var(--animation-duration) ease-in-out infinite,
      novelai-edge-glow var(--animation-duration) ease-in-out infinite;
    animation-delay: inherit;
  }

  @keyframes novelai-translate-z {
    0%,
    40%,
    100% {
      transform: translateZ(-2px);
    }
    30% {
      transform: translateZ(14px) translateY(-1px);
    }
  }

  @keyframes novelai-face-color {
    0%,
    50%,
    100% {
      background-color: var(--cube-color);
    }
    10% {
      background-color: ${ACCENT_SOFT};
    }
  }

  @keyframes novelai-face-glow {
    0%,
    50%,
    100% {
      color: #fff0;
      filter: none;
    }
    30% {
      color: ${palette.cubeTextDark};
      filter: drop-shadow(0 10px 8px rgba(233, 181, 11, 0.45));
    }
  }

  @keyframes novelai-edge-glow {
    0%,
    40%,
    100% {
      box-shadow:
        inset 0 0 2px 1px ${NEU_SHADOW_IN},
        inset 0 0 10px 1px ${NEU_SHADOW_HI};
    }
    30% {
      box-shadow:
        0 0 0 1px var(--highlight-mid),
        inset 0 0 8px rgba(233, 181, 11, 0.22);
    }
  }
`

export default NovelAiCubeLoader
