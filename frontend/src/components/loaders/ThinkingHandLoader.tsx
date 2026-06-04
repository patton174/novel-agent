import styled from 'styled-components'
import { palette } from '../../styles/theme'

/** 思考中专用动画（配色适配 Novel AI 金色主题） */
export function ThinkingHandLoader() {
  return (
    <StyledWrapper aria-hidden>
      <div className="hand">
        <div className="finger" />
        <div className="finger" />
        <div className="finger" />
        <div className="finger" />
        <div className="palm" />
        <div className="thumb" />
      </div>
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  --skin-color: ${palette.accent};
  --skin-shadow: ${palette.accentDeep};
  --tap-speed: 0.6s;
  --tap-stagger: 0.1s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  transform: scale(0.42);
  transform-origin: left center;
  margin-right: -36px;

  .hand {
    position: relative;
    width: 80px;
    height: 60px;
  }

  .hand::before {
    content: '';
    display: block;
    width: 180%;
    height: 75%;
    position: absolute;
    top: 70%;
    right: 20%;
    background-color: var(--skin-shadow);
    border-radius: 40px 10px;
    filter: blur(10px);
    opacity: 0.28;
  }

  .palm {
    display: block;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    background: linear-gradient(145deg, ${palette.accentHighlight}, var(--skin-color));
    border-radius: 10px 40px;
  }

  .thumb {
    position: absolute;
    width: 120%;
    height: 38px;
    background: linear-gradient(145deg, ${palette.accentHighlight}, var(--skin-color));
    bottom: -18%;
    right: 1%;
    transform-origin: calc(100% - 20px) 20px;
    transform: rotate(-20deg);
    border-radius: 30px 20px 20px 10px;
    border-bottom: 2px solid rgba(0, 0, 0, 0.08);
    border-left: 2px solid rgba(0, 0, 0, 0.06);
  }

  .thumb::after {
    width: 20%;
    height: 60%;
    content: '';
    background-color: rgba(255, 255, 255, 0.35);
    position: absolute;
    bottom: -8%;
    left: 5px;
    border-radius: 60% 10% 10% 30%;
    border-right: 2px solid rgba(0, 0, 0, 0.04);
  }

  .finger {
    position: absolute;
    width: 80%;
    height: 35px;
    background: linear-gradient(145deg, ${palette.accentHighlight}, var(--skin-color));
    bottom: 32%;
    right: 64%;
    transform-origin: 100% 20px;
    animation-duration: calc(var(--tap-speed) * 2);
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    transform: rotate(10deg);
  }

  .finger::before {
    content: '';
    position: absolute;
    width: 140%;
    height: 30px;
    background: linear-gradient(145deg, ${palette.accentHighlight}, var(--skin-color));
    bottom: 8%;
    right: 65%;
    transform-origin: calc(100% - 20px) 20px;
    transform: rotate(-60deg);
    border-radius: 20px;
  }

  .finger:nth-child(1) {
    animation-delay: 0;
    filter: brightness(0.88);
    animation-name: tap-upper-1;
  }

  .finger:nth-child(2) {
    animation-delay: var(--tap-stagger);
    filter: brightness(0.92);
    animation-name: tap-upper-2;
  }

  .finger:nth-child(3) {
    animation-delay: calc(var(--tap-stagger) * 2);
    filter: brightness(0.96);
    animation-name: tap-upper-3;
  }

  .finger:nth-child(4) {
    animation-delay: calc(var(--tap-stagger) * 3);
    filter: brightness(1);
    animation-name: tap-upper-4;
  }

  @keyframes tap-upper-1 {
    0%, 50%, 100% { transform: rotate(10deg) scale(0.4); }
    40% { transform: rotate(50deg) scale(0.4); }
  }

  @keyframes tap-upper-2 {
    0%, 50%, 100% { transform: rotate(10deg) scale(0.6); }
    40% { transform: rotate(50deg) scale(0.6); }
  }

  @keyframes tap-upper-3 {
    0%, 50%, 100% { transform: rotate(10deg) scale(0.8); }
    40% { transform: rotate(50deg) scale(0.8); }
  }

  @keyframes tap-upper-4 {
    0%, 50%, 100% { transform: rotate(10deg) scale(1); }
    40% { transform: rotate(50deg) scale(1); }
  }
`
