import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { NovelAiWordmark } from './NovelAiWordmark'
import { cursorTheme } from '../../styles/surfaces/cursorLanding'

const Header = styled.header`
  padding: 1rem 1.5rem;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(247, 247, 244, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid ${cursorTheme.border};
`

const NavRow = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1120px;
  margin: 0 auto;
`

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.15s ease;
  &:hover {
    opacity: 0.88;
  }
`

const NavActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
`

const NavGhostBtn = styled(Link)`
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 600;
  color: ${cursorTheme.textMuted};
  text-decoration: none;
  transition: color 0.15s ease, background 0.15s ease;

  &:hover {
    color: ${cursorTheme.text};
    background: ${cursorTheme.card};
  }
`

const NavPrimaryBtn = styled(Link)`
  padding: 0.5rem 1.15rem;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 600;
  color: ${cursorTheme.cardElevated};
  background: ${cursorTheme.text};
  text-decoration: none;
  transition: opacity 0.15s ease, transform 0.15s ease;

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }
`

/** 顶栏 — 与 Hero 区 cursor 主题统一 */
export function MarketingNav() {
  return (
    <Header>
      <NavRow aria-label="主导航">
        <LogoLink to="/" aria-label="Novel AI 首页">
          <NovelAiWordmark size="sm" animate={false} />
        </LogoLink>
        <NavActions>
          <NavGhostBtn to="/editor">创作</NavGhostBtn>
          <NavPrimaryBtn to="/login">登录</NavPrimaryBtn>
        </NavActions>
      </NavRow>
    </Header>
  )
}
