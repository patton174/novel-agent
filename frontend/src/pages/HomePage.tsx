import { MarketingShell } from '../components/marketing/MarketingShell'
import { MarketingNav } from '../components/marketing/MarketingNav'
import { HomeFeasibilitySection } from '../components/marketing/sections/HomeFeasibilitySection'
import { HomeScrollStory } from '../components/marketing/scroll/HomeScrollStory'
import { HomeDanmakuSection } from '../components/marketing/sections/HomeDanmakuSection'
import { HomeFooterSection } from '../components/marketing/sections/HomeFooterSection'
import { HomeHeroSection } from '../components/marketing/sections/HomeHeroSection'
import { MARKETING_MAIN } from '@/lib/marketingShellClasses'
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
