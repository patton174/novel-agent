import { motion, useReducedMotion } from 'framer-motion'
import styled, { css } from 'styled-components'
import { cursorTheme } from '../../../styles/surfaces/cursorLanding'
import { font } from '../../../styles/theme'

export interface StoryPoint {
  highlight: string
  text: string
}

export const StoryCopyBlock = styled.div`
  width: 100%;
  max-width: 21rem;
  text-align: left;
`

export const StoryPointList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`

export const StoryCopyRoot = styled.div<{ $alignEnd?: boolean }>`
  padding-top: 1.25rem;
  width: 100%;

  ${({ $alignEnd }) =>
    $alignEnd &&
    css`
      @media (min-width: 901px) {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
    `}

  @media (max-width: 900px) {
    padding-top: 0;
    display: flex;
    flex-direction: column;
    align-items: center;

    ${StoryCopyBlock} {
      max-width: 20rem;
    }
  }
`

export const StoryActRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1.1rem;
`

export const StoryActIndex = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.45rem;
  border-radius: 10px;
  font-family: ${font.mono};
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: ${cursorTheme.accent};
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.14), rgba(79, 70, 229, 0.05));
  border: 1px solid rgba(79, 70, 229, 0.18);
`

export const StoryActLabel = styled.span`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${cursorTheme.textMuted};
`

export const StoryTitle = styled.h3`
  margin: 0 0 0.85rem;
  font-family: ${font.display};
  font-size: clamp(1.75rem, 3.4vw, 2.45rem);
  font-weight: 650;
  letter-spacing: -0.035em;
  line-height: 1.12;
  color: ${cursorTheme.text};
`

export const StoryTitleAccent = styled.span`
  display: block;
  margin-top: 0.15rem;
  background: linear-gradient(105deg, ${cursorTheme.accent} 0%, #6366f1 45%, #818cf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`

export const StoryLead = styled.p`
  margin: 0 0 1.35rem;
  font-size: 1.02rem;
  line-height: 1.68;
  color: ${cursorTheme.textMuted};
`

export const StoryPointItem = styled.li`
  position: relative;
  padding-left: 1rem;
  font-size: 0.88rem;
  line-height: 1.55;
  color: ${cursorTheme.text};

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.58em;
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: ${cursorTheme.accent};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
  }

  strong {
    font-weight: 650;
    color: ${cursorTheme.text};
  }
`

interface MarketingStoryCopyProps {
  act: string
  label: string
  title: string
  titleAccent: string
  lead: string
  points: StoryPoint[]
  alignEnd?: boolean
  className?: string
}

export function MarketingStoryCopy({
  act,
  label,
  title,
  titleAccent,
  lead,
  points,
  alignEnd,
  className,
}: MarketingStoryCopyProps) {
  const reduced = useReducedMotion()

  const inner = (
    <StoryCopyBlock>
      <StoryActRow>
        <StoryActIndex>{act}</StoryActIndex>
        <StoryActLabel>{label}</StoryActLabel>
      </StoryActRow>
      <StoryTitle>
        {title}
        <StoryTitleAccent>{titleAccent}</StoryTitleAccent>
      </StoryTitle>
      <StoryLead>{lead}</StoryLead>
      <StoryPointList>
        {points.map((point) => (
          <StoryPointItem key={point.highlight}>
            <strong>{point.highlight}</strong> · {point.text}
          </StoryPointItem>
        ))}
      </StoryPointList>
    </StoryCopyBlock>
  )

  return (
    <StoryCopyRoot className={className} $alignEnd={alignEnd}>
      {reduced ? (
        inner
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px', amount: 0.35 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {inner}
        </motion.div>
      )}
    </StoryCopyRoot>
  )
}
