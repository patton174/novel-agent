import { MarketingShell } from '../components/marketing/MarketingShell'
import { MarketingNav } from '../components/marketing/MarketingNav'
import { HomeFeasibilitySection } from '../components/marketing/sections/HomeFeasibilitySection'
import { HomeScrollStory } from '../components/marketing/scroll/HomeScrollStory'
import { HomeDanmakuSection } from '../components/marketing/sections/HomeDanmakuSection'
import { HomeFooterSection } from '../components/marketing/sections/HomeFooterSection'
import { HomeHeroSection } from '../components/marketing/sections/HomeHeroSection'
import { MARKETING_MAIN } from '@/lib/marketingShellClasses'
import { useEffect } from 'react'

export default function HomePage() {
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <MarketingShell>
      <MarketingNav />
      <main className={MARKETING_MAIN}>
        <HomeHeroSection />
        <HomeFeasibilitySection />
        <HomeScrollStory />
        <HomeDanmakuSection />
      </main>
      <HomeFooterSection />
    </MarketingShell>
  )
}
