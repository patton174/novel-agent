import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { isLoggedIn } from '../../../utils/auth'
import { ArrowIcon } from '../icons'
import { MarketingHeroDemo } from '../demo/MarketingHeroDemo'
import {
  CursorHeroActions,
  CursorHeroInner,
  CursorHeroSection,
  CursorHeroSubtitle,
  CursorHeroTitle,
  CursorPrimaryBtn,
  CursorSecondaryBtn,
} from '../../../styles/surfaces/cursorLandingHero'

export function HomeHeroSection() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const goStart = () => navigate(isLoggedIn() ? '/dashboard' : '/login')

  const content = (
    <>
      <CursorHeroTitle>专为小说创作打造的 Agent，理解你的笔触与灵感。</CursorHeroTitle>
      <CursorHeroSubtitle>
        从世界观到章节续写 — 思维链、编排、子代理、流式成稿，一站完成。
      </CursorHeroSubtitle>
      <CursorHeroActions>
        <CursorPrimaryBtn type="button" onClick={goStart}>
          开始创作
          <ArrowIcon />
        </CursorPrimaryBtn>
        <CursorSecondaryBtn to="/login">登录</CursorSecondaryBtn>
      </CursorHeroActions>
      <MarketingHeroDemo />
    </>
  )

  return (
    <CursorHeroSection id="hero">
      <CursorHeroInner>
        {reduced ? (
          content
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {content}
          </motion.div>
        )}
      </CursorHeroInner>
    </CursorHeroSection>
  )
}
