import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { font } from '../theme'
import { cursorTheme } from './cursorLanding'

export const CursorHeroSection = styled.section`
  width: 100%;
  padding: 5.5rem 1.5rem 3.5rem;
  background: ${cursorTheme.bg};
  scroll-margin-top: 72px;
`

export const CursorHeroInner = styled.div`
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  text-align: center;
`

export const CursorHeroWordmark = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
`

export const CursorHeroTitle = styled.h1`
  margin: 0 auto 1.25rem;
  max-width: 18ch;
  font-family: ${font.display};
  font-size: clamp(2.2rem, 5.5vw, 3.75rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.08;
  color: ${cursorTheme.text};
  padding-top: 0.5rem;
`

export const CursorHeroSubtitle = styled.p`
  margin: 0 auto 2rem;
  max-width: 36rem;
  font-size: clamp(1rem, 2vw, 1.15rem);
  line-height: 1.6;
  color: ${cursorTheme.textMuted};
`

export const CursorHeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
`

export const CursorPrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.35rem;
  border: none;
  border-radius: 999px;
  background: ${cursorTheme.text};
  color: ${cursorTheme.cardElevated};
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    opacity: 0.92;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

export const CursorSecondaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 0.65rem 1.35rem;
  border-radius: 999px;
  border: 1px solid ${cursorTheme.borderStrong};
  background: ${cursorTheme.cardElevated};
  color: ${cursorTheme.text};
  font-size: 0.92rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s ease, transform 0.2s ease;

  &:hover {
    background: ${cursorTheme.card};
    transform: translateY(-1px);
  }
`
