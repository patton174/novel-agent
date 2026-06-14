import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { NovelAiWordmark } from './NovelAiWordmark'
import { MKT_CTA_PRIMARY } from '@/lib/marketingCta'

function useIsHome() {
  const { pathname } = useLocation()
  return pathname === '/'
}

const HOME_ANCHORS = [
  { id: 'feasibility', labelKey: 'nav.feasibility' as const },
  { id: 'demo-story', labelKey: 'nav.demo' as const },
  { id: 'timeline', labelKey: 'nav.timeline' as const },
] as const

export function MarketingNav() {
  const { t } = useTranslation('marketing')
  const location = useLocation()
  const isHome = useIsHome()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const linkClass = (path: string) =>
    `transition-colors hover:text-foreground ${
      location.pathname === path ? 'text-foreground font-semibold' : 'text-muted-foreground'
    }`

  const scrollTo = (id: string) => {
    setOpen(false)
    if (isHome) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const navGlass = scrolled || !isHome

  const anchorLinks = (
    <div className="flex items-center gap-5 text-sm font-medium">
      {HOME_ANCHORS.map(({ id, labelKey }) =>
        isHome ? (
          <button key={id} type="button" onClick={() => scrollTo(id)} className="text-muted-foreground transition-colors hover:text-foreground">
            {t(labelKey)}
          </button>
        ) : (
          <Link key={id} to={`/#${id}`} className="text-muted-foreground transition-colors hover:text-foreground">
            {t(labelKey)}
          </Link>
        ),
      )}
    </div>
  )

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        navGlass
          ? 'border-b border-border/70 bg-background/88 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6" aria-label="主导航">
        <Link
          to="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          aria-label={`${t('brand')} 首页`}
        >
          <NovelAiWordmark size="sm" animate={false} />
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {anchorLinks}
          <div className="flex items-center gap-7 text-sm font-medium">
            <Link to="/guide" className={linkClass('/guide')}>
              {t('nav.guide')}
            </Link>
            <Link to="/pricing" className={linkClass('/pricing')}>
              {t('nav.pricing')}
            </Link>
            <Link to="/about" className={linkClass('/about')}>
              {t('nav.about')}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              {t('nav.login')}
            </Link>
            <Link to="/register" className={cn(MKT_CTA_PRIMARY, 'px-4 py-2 text-sm')}>
              {t('nav.register')}
            </Link>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-border/80 bg-white/80 text-foreground backdrop-blur-sm md:hidden"
          aria-expanded={open}
          aria-label={open ? t('nav.close') : t('nav.menu')}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open ? (
        <div className="border-t border-border/60 bg-background/95 px-6 py-4 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 text-sm font-medium">
            {HOME_ANCHORS.map(({ id, labelKey }) =>
              isHome ? (
                <button
                  key={id}
                  type="button"
                  className="rounded-lg px-3 py-2.5 text-left hover:bg-surface-hover"
                  onClick={() => scrollTo(id)}
                >
                  {t(labelKey)}
                </button>
              ) : (
                <Link
                  key={id}
                  to={`/#${id}`}
                  className="rounded-lg px-3 py-2.5 hover:bg-surface-hover"
                >
                  {t(labelKey)}
                </Link>
              ),
            )}
            <Link to="/guide" className={`rounded-lg px-3 py-2.5 hover:bg-surface-hover ${linkClass('/guide')}`}>
              {t('nav.guide')}
            </Link>
            <Link to="/pricing" className={`rounded-lg px-3 py-2.5 hover:bg-surface-hover ${linkClass('/pricing')}`}>
              {t('nav.pricing')}
            </Link>
            <Link to="/about" className={`rounded-lg px-3 py-2.5 hover:bg-surface-hover ${linkClass('/about')}`}>
              {t('nav.about')}
            </Link>
            <hr className="my-2 border-border/60" />
            <Link to="/login" className="rounded-lg px-3 py-2.5 hover:bg-surface-hover">
              {t('nav.login')}
            </Link>
            <Link to="/register" className={cn(MKT_CTA_PRIMARY, 'mt-1 px-4 py-2.5 text-center text-sm')}>
              {t('nav.register')}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
