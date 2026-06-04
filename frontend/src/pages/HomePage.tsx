import { MarketingShell } from '../components/marketing/MarketingShell'
import { MarketingNav } from '../components/marketing/MarketingNav'
import { ScrollProgressRail } from '../components/marketing/scroll/ScrollProgressRail'
import { HomeScrollStory } from '../components/marketing/scroll/HomeScrollStory'
import { HomeCapabilitiesSection } from '../components/marketing/sections/HomeCapabilitiesSection'
import { HomeFooterSection } from '../components/marketing/sections/HomeFooterSection'
import { HomeHeroSection } from '../components/marketing/sections/HomeHeroSection'
import { MarketingMain } from '../styles/surfaces/marketing'
import { useGsapMarketingExtras } from '../components/marketing/scroll/useGsapMarketingExtras'

export default function HomePage() {
  useGsapMarketingExtras()

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
