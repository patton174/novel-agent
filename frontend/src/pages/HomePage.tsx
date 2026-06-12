import { MarketingShell } from '../components/marketing/MarketingShell'
import { MarketingNav } from '../components/marketing/MarketingNav'
import { HomeScrollStory } from '../components/marketing/scroll/HomeScrollStory'
import { HomeTimelineSection } from '../components/marketing/sections/HomeTimelineSection'
import { HomeDanmakuSection } from '../components/marketing/sections/HomeDanmakuSection'
import { HomeFooterSection } from '../components/marketing/sections/HomeFooterSection'
import { HomeHeroSection } from '../components/marketing/sections/HomeHeroSection'
import { MarketingMain } from '../styles/surfaces/marketing'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isLoggedIn } from '../utils/auth'
import { useAuthReady } from '../security/useAuthReady'

export default function HomePage() {
  const navigate = useNavigate()
  const authReady = useAuthReady()

  useEffect(() => {
    if (authReady && isLoggedIn()) {
      navigate('/dashboard', { replace: true })
    }
  }, [authReady, navigate])

  return (
    <MarketingShell>
      <MarketingNav />
      <MarketingMain>
        <HomeHeroSection />
        <HomeScrollStory />
        <HomeTimelineSection />
        <HomeDanmakuSection />
      </MarketingMain>
      <HomeFooterSection />
    </MarketingShell>
  )
}
