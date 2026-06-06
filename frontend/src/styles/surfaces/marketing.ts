import styled, { css } from 'styled-components'
import { font, palette, radius, shadow, transition } from '../theme'
import { sectionHeadingCss, sectionSubheadingCss, textStyle } from '../typography'

/* 营销落地页布局与卡片 */

export const MarketingPageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f7f7f4;
  position: relative;
  overflow-x: hidden;
  overflow-anchor: none;
`

export const MarketingBackgroundPattern = styled.div`
  position: absolute;
  inset: 0;
  background: #f7f7f4;
  pointer-events: none;
`

export const MarketingFloatingShapes = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
`

export const MarketingShape = styled.div`
  position: absolute;
  border-radius: ${radius.round};
  opacity: 0.4;

  &.shape-1 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, transparent 70%);
    top: 10%;
    left: -5%;
    animation: float1 8s ease-in-out infinite;
  }

  &.shape-2 {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(0, 164, 239, 0.12) 0%, transparent 70%);
    top: 30%;
    right: 5%;
    animation: float2 10s ease-in-out infinite;
  }

  &.shape-3 {
    width: 150px;
    height: 150px;
    background: radial-gradient(circle, rgba(127, 186, 0, 0.1) 0%, transparent 70%);
    bottom: 20%;
    left: 10%;
    animation: float3 12s ease-in-out infinite;
  }

  &.shape-4 {
    width: 180px;
    height: 180px;
    background: radial-gradient(circle, rgba(242, 80, 34, 0.08) 0%, transparent 70%);
    bottom: 30%;
    right: -3%;
    animation: float1 9s ease-in-out infinite reverse;
  }

  @keyframes float1 {
    0%,
    100% {
      transform: translate(0, 0) rotate(0deg);
    }
    50% {
      transform: translate(20px, -30px) rotate(5deg);
    }
  }

  @keyframes float2 {
    0%,
    100% {
      transform: translate(0, 0) rotate(0deg);
    }
    50% {
      transform: translate(-15px, 25px) rotate(-5deg);
    }
  }

  @keyframes float3 {
    0%,
    100% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(25px, 15px) scale(1.05);
    }
  }
`

export const MarketingHeader = styled.header`
  padding: 1.25rem 2rem;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${palette.surfaceAlpha};
  backdrop-filter: blur(12px);

  .nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: inherit;
    transition: opacity ${transition.fast};
    &:hover {
      opacity: 0.88;
    }
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.5rem;

    a {
      color: ${palette.textSecondary};
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
      transition: color ${transition.fast};

      &:hover {
        color: ${palette.text};
      }
    }

    .nav-login {
      background: ${palette.bg};
      color: ${palette.text} !important;
      padding: 0.65rem 1.5rem;
      border-radius: ${radius.md};
      box-shadow: ${shadow.outSm};
      font-weight: 600;

      &:hover {
        background: ${palette.bgSidebar};
        transform: translateY(-1px);
      }
    }
  }
`

export const MarketingMain = styled.main`
  flex: 1;
  padding-top: 0;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-bottom: 2rem;
`

export const MarketingSection = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  scroll-margin-top: 88px;
`

export const MarketingCardInner = styled.div<{ $glow?: boolean }>`
  position: relative;
  background: linear-gradient(165deg, #f4f4f4 0%, ${palette.bgSidebar} 48%, #e8e8e8 100%);
  border-radius: ${radius.pill};
  padding: 3.5rem;
  box-shadow: ${shadow.cardHero};
  border: 1px solid rgba(255, 255, 255, 0.65);

  ${({ $glow }) =>
    $glow &&
    css`
      &::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: inherit;
        padding: 1px;
        background: linear-gradient(
          135deg,
          rgba(79, 70, 229, 0.55),
          rgba(0, 164, 239, 0.25),
          rgba(79, 70, 229, 0.35)
        );
        mask:
          linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        mask-composite: exclude;
        pointer-events: none;
        opacity: 0.85;
      }
    `}
`

export const MarketingBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${palette.bg};
  padding: 0.5rem 1rem;
  border-radius: ${radius.xl};
  font-size: 0.8rem;
  color: ${palette.textDim};
  margin-bottom: 1.5rem;
  box-shadow: ${shadow.inBadge};

  .badge-dot {
    width: 8px;
    height: 8px;
    background: ${palette.success};
    border-radius: ${radius.round};
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.2);
    }
  }
`

export const MarketingHeroWordmark = styled.div`
  margin-bottom: 1.25rem;
  display: flex;
  justify-content: center;
`

export const MarketingHeroTitle = styled.h1`
  margin: 0 0 1rem;

  .title-main {
    display: block;
    ${textStyle('display')}
    color: ${palette.text};
  }

  .title-accent {
    display: block;
    ${textStyle('display')}
    background: linear-gradient(105deg, #c99208 0%, ${palette.accent} 42%, #f5d86a 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 2px 0 ${palette.accentGhost});
  }
`

export const MarketingFeaturePills = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
`

export const MarketingFeaturePill = styled.span`
  font-size: 0.78rem;
  font-weight: 600;
  color: ${palette.textSecondary};
  padding: 0.35rem 0.85rem;
  border-radius: ${radius.xl};
  background: ${palette.bg};
  box-shadow: ${shadow.inBadge};
  letter-spacing: 0.02em;
`

export const MarketingSubtitle = styled.p`
  ${textStyle('subtitle')}
  color: ${palette.textDim};
  margin: 0 0 2rem;
  max-width: 580px;
  line-height: 1.65;
`

export const MarketingActionLink = styled.a<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  border-radius: 14px;
  transition: all ${transition.base};

  ${({ $primary }) =>
    $primary
      ? css`
          background: ${palette.ink};
          color: ${palette.white};
          box-shadow: ${shadow.outMd};
          &:hover {
            background: ${palette.inkHover};
            transform: translateY(-2px);
            box-shadow: ${shadow.outMdHover};
          }
        `
      : css`
          background: ${palette.bgSidebar};
          color: ${palette.text};
          box-shadow: ${shadow.out};
          &:hover {
            background: ${palette.bgHover};
            transform: translateY(-2px);
          }
        `}
`

export const MarketingStatsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1.5rem 2rem;
  background: ${palette.bg};
  border-radius: ${radius.xl};
  box-shadow: ${shadow.inStats};
`

export const MarketingStatItem = styled.div`
  text-align: center;

  .stat-num {
    display: block;
    font-size: 1.75rem;
    font-weight: 800;
    color: ${palette.accent};
    letter-spacing: -0.5px;
  }

  .stat-txt {
    font-size: 0.8rem;
    color: ${palette.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`

export const MarketingStatDivider = styled.div`
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, transparent, ${palette.divider}, transparent);
`

export const MarketingSectionTitle = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;

  h2 {
    ${sectionHeadingCss}
  }

  p {
    ${sectionSubheadingCss}
    color: ${palette.textMuted};
  }
`

export const MarketingSectionDivider = styled.hr`
  border: none;
  height: 1px;
  margin: 2.5rem 0;
  background: linear-gradient(
    90deg,
    transparent,
    ${palette.divider} 20%,
    ${palette.divider} 80%,
    transparent
  );
`

export const MarketingStepCard = styled.div`
  flex: 1;
  text-align: center;
  max-width: 280px;
  padding: 2rem 1.5rem;
  background: ${palette.bg};
  border-radius: ${radius.xxl};
  box-shadow: ${shadow.cardStep};
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition:
    transform ${transition.base},
    box-shadow ${transition.base};

  &:hover {
    transform: translateY(-6px);
    box-shadow:
      ${shadow.cardStep},
      0 12px 28px rgba(0, 0, 0, 0.08);
  }
`

export const MarketingStepNumber = styled.div`
  font-size: 3rem;
  font-weight: 800;
  color: ${palette.accentGhost};
  margin-bottom: -1rem;
  letter-spacing: -2px;
`

export const MarketingStepIcon = styled.div<{ $color: string }>`
  width: 64px;
  height: 64px;
  background: ${({ $color }) => $color};
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  box-shadow:
    4px 4px 12px ${({ $color }) => `${$color}50`},
    -4px -4px 12px ${palette.white};
`

export const MarketingStepConnector = styled.div`
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, ${palette.accent}, ${palette.brandBlue});
  margin-top: 5rem;
  border-radius: 1px;

  @media (max-width: 800px) {
    width: 2px;
    height: 40px;
    background: linear-gradient(180deg, ${palette.accent}, ${palette.brandBlue});
    margin-top: 0;
    margin: 0.5rem 0;
  }
`

export const MarketingFooter = styled.footer`
  padding: 2rem 2rem 2.5rem;
  position: relative;
  z-index: 1;
  border-top: 1px solid ${palette.border};
`

export const MarketingFooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;

  .copyright {
    margin: 0;
    font-size: 0.82rem;
    color: ${palette.textFaint};
  }
`

export const MarketingFooterCta = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
`

export const MarketingFooterLinks = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;

  a {
    color: ${palette.textSubtle};
    text-decoration: none;
    transition: color ${transition.fast};

    &:hover {
      color: ${palette.accent};
    }
  }

  span {
    color: ${palette.footerDot};
  }
`
export const MarketingHeroContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`

export const MarketingHeroEntrance = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`

export const MarketingSearchWrapper = styled.div`
  width: 100%;
  max-width: 500px;
  margin-bottom: 2rem;
`

export const MarketingHeroActions = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
`

export const MarketingStepsGrid = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 1rem;

  @media (max-width: 800px) {
    flex-direction: column;
    align-items: center;
  }
`

export const MarketingStepTitle = styled.h3`
  ${textStyle('h3')}
  color: ${palette.text};
  margin: 0 0 0.5rem;
`

export const MarketingStepDesc = styled.p`
  ${textStyle('bodySm')}
  color: ${palette.textSubtle};
  margin: 0;
`

export const MarketingShowcaseGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`

export const MarketingQuote = styled.p`
  ${textStyle('body')}
  color: ${palette.proseMuted};
  margin: 0 0 1.5rem;
  line-height: 1.7;
`

export const MarketingAuthorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

export const MarketingAuthorAvatar = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, ${palette.accent}, #f0d060);
  border-radius: ${radius.round};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${palette.text};
`

export const MarketingAuthorMeta = styled.div`
  display: flex;
  flex-direction: column;

  .author-name {
    font-weight: 600;
    color: ${palette.text};
    font-size: 1rem;
  }

  .author-title {
    font-size: 0.85rem;
    color: ${palette.textMuted};
  }
`

export const MarketingCodeWindow = styled.div`
  .code-window {
    background: ${palette.codeBg};
    border-radius: ${radius.lg};
    overflow: hidden;
    box-shadow: ${shadow.window};
  }

  .window-header {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background: ${palette.chrome};

    .dot {
      width: 12px;
      height: 12px;
      border-radius: ${radius.round};

      &.red {
        background: #ff5f56;
      }
      &.yellow {
        background: #ffbd2e;
      }
      &.green {
        background: #27c93f;
      }
    }
  }

  .window-content {
    padding: 1.5rem;
    font-family: ${font.monoAlt};
  }

  .prompt-label,
  .output-label {
    display: block;
    font-size: 0.75rem;
    color: ${palette.textMuted};
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .prompt-text {
    color: ${palette.codeText};
    margin: 0 0 1.5rem;
    line-height: 1.6;
  }

  .output-label {
    color: ${palette.success};
  }

  .output-text {
    color: ${palette.accent};
    margin: 0;
    line-height: 1.6;
  }
`

export const MarketingCtaWordmark = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1.25rem;
`

export const MarketingCtaBlock = styled.div`
  text-align: center;
  padding: 2.5rem 2rem;
  border-radius: ${radius.xxl};
  background: linear-gradient(
    135deg,
    rgba(79, 70, 229, 0.14) 0%,
    rgba(255, 255, 255, 0.35) 45%,
    rgba(0, 164, 239, 0.08) 100%
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);

  h2 {
    ${textStyle('h2')}
    color: ${palette.text};
    margin: 0 0 1rem;
  }

  p {
    ${textStyle('body')}
    color: ${palette.textSubtle};
    margin: 0 0 2rem;
  }

  .cta-actions {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
`

export const MarketingShowcaseTag = styled.span`
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${palette.accentDark};
  margin-bottom: 1rem;
`

export const MarketingTypingCursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  background: ${palette.accent};
  vertical-align: text-bottom;
  animation: blink 1s step-end infinite;

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
`
