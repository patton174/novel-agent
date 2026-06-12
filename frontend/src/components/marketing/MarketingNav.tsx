import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NovelAiWordmark } from './NovelAiWordmark'

export function MarketingNav() {
  const { t } = useTranslation('marketing')
  const location = useLocation()

  const linkClass = (path: string) =>
    `transition-colors hover:text-foreground ${
      location.pathname === path ? 'text-foreground font-semibold' : 'text-muted-foreground'
    }`

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6" aria-label="主导航">
        <Link
          to="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          aria-label={`${t('brand')} 首页`}
        >
          <NovelAiWordmark size="sm" animate={false} />
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-7 text-sm font-medium md:flex">
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
            <Link
              to="/register"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md"
            >
              {t('nav.register')}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
