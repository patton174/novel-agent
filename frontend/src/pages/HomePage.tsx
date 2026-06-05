import { MarketingShell } from '../components/marketing/MarketingShell'
import { MarketingNav } from '../components/marketing/MarketingNav'
import { ScrollProgressRail } from '../components/marketing/scroll/ScrollProgressRail'
import { HomeScrollStory } from '../components/marketing/scroll/HomeScrollStory'
import { HomeCapabilitiesSection } from '../components/marketing/sections/HomeCapabilitiesSection'
import { HomeFooterSection } from '../components/marketing/sections/HomeFooterSection'
import { HomeHeroSection } from '../components/marketing/sections/HomeHeroSection'
import { MarketingMain } from '../styles/surfaces/marketing'
import { useGsapMarketingExtras } from '../components/marketing/scroll/useGsapMarketingExtras'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isLoggedIn } from '../utils/auth'
import { useAuthReady } from '../security/useAuthReady'

export default function HomePage() {
  useGsapMarketingExtras()
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
      <ScrollProgressRail />
      <MarketingMain>
        <HomeHeroSection />
        <HomeScrollStory />
        <HomeCapabilitiesSection />
      </MarketingMain>
      <HomeFooterSection />
    </MarketingShell>
  )
}
