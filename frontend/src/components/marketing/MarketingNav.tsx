import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { NovelAiPixelWordmark } from './pixel/NovelAiPixelWordmark'
import { MKT_CTA_PRIMARY } from '@/lib/marketingCta'
import { MarketingAuthFlipCta } from './MarketingAuthFlipCta'
import { LocaleToggle } from '@/components/i18n/LocaleToggle'
import { MarketingThemeToggle } from '@/components/theme/MarketingThemeToggle'
import { isLoggedIn } from '@/utils/auth'
import { useAuthReady } from '@/security/useAuthReady'

export function MarketingNav() {
  const { t } = useTranslation(['marketing', 'common'])
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const isHome = location.pathname === '/'
  const authReady = useAuthReady()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (authReady) {
      setLoggedIn(isLoggedIn())
    }
  }, [authReady, location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const linkClass = (path: string) =>
    `font-mono text-sm font-bold uppercase tracking-wide transition-colors hover:bg-neon hover:text-foreground ${
      location.pathname === path ? 'bg-foreground text-background' : 'text-foreground'
    } px-3 py-1.5`

  const navGlass = scrolled || !isHome

  const pageLinks = (
    <>
      <Link to="/pricing" className={linkClass('/pricing')}>
        {t('marketing:nav.pricing')}
      </Link>
      <Link to="/about" className={linkClass('/about')}>
        {t('marketing:nav.about')}
      </Link>
    </>
  )

  const authCtaDesktop = loggedIn ? (
    <Link to="/dashboard" className={cn(MKT_CTA_PRIMARY, 'px-4 py-2 text-sm')}>
      {t('common:cta.dashboard')}
    </Link>
  ) : (
    <MarketingAuthFlipCta size="md" />
  )

  const authCtaMobileMenu = loggedIn ? (
    <Link to="/dashboard" className={cn(MKT_CTA_PRIMARY, 'mt-1 px-4 py-2.5 text-center text-sm')}>
      {t('common:cta.dashboard')}
    </Link>
  ) : (
    <MarketingAuthFlipCta size="md" fullWidth className="mt-1" />
  )

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-colors duration-200',
        navGlass
          ? 'border-b-2 border-foreground bg-background'
          : 'border-b-2 border-transparent bg-background',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6" aria-label="主导航">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
          aria-label={`${t('marketing:brand')} 首页`}
        >
          <NovelAiPixelWordmark size="sm" className="inline-flex sm:hidden" />
          <NovelAiPixelWordmark size="md" className="hidden sm:inline-flex" />
        </Link>

        <div className="hidden items-center gap-4 md:flex">
          <div className="flex items-center gap-1">{pageLinks}</div>
          <div className="relative z-[2] flex items-center gap-2">
            <MarketingThemeToggle compact />
            <LocaleToggle compact />
            {authCtaDesktop}
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          <MarketingThemeToggle compact />
          <LocaleToggle compact />
          {loggedIn ? (
            <Link
              to="/dashboard"
              className={cn(MKT_CTA_PRIMARY, 'px-3 py-2 text-[0.68rem] uppercase')}
            >
              {t('common:cta.dashboard')}
            </Link>
          ) : (
            <MarketingAuthFlipCta variant="icon" size="sm" />
          )}
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center border-2 border-foreground bg-surface text-foreground"
            aria-expanded={open}
            aria-label={open ? t('marketing:nav.close') : t('marketing:nav.menu')}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="border-t-2 border-foreground bg-background px-4 py-4 sm:px-6 md:hidden">
          <div className="flex flex-col gap-1">
            <Link to="/pricing" className={linkClass('/pricing')}>
              {t('marketing:nav.pricing')}
            </Link>
            <Link to="/about" className={linkClass('/about')}>
              {t('marketing:nav.about')}
            </Link>
            {loggedIn ? (
              <>
                <div className="my-2 h-0.5 bg-foreground/20" />
                {authCtaMobileMenu}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  )
}
