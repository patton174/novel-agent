import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowIcon } from '../icons'

type FooterVariant = 'full' | 'linksOnly'

export function HomeFooterSection({ variant = 'full' }: { variant?: FooterVariant }) {
  const { t } = useTranslation('marketing')
  const year = new Date().getFullYear()

  const productLinks = [
    { label: t('nav.guide'), to: '/guide' },
    { label: t('nav.pricing'), to: '/pricing' },
    { label: t('nav.about'), to: '/about' },
  ] as const

  const accountLinks = [
    { label: t('nav.login'), to: '/login' },
    { label: t('nav.register'), to: '/register' },
    { label: '创作台', to: '/editor' },
  ] as const

  const legalLinks = [
    { label: '隐私政策', to: '/privacy' },
    { label: '用户协议', to: '/terms' },
    { label: '联系我们', to: '/contact' },
  ] as const

  return (
    <footer className={`relative z-10 w-full ${variant === 'full' ? '-mt-16' : ''}`}>
      {variant === 'full' ? (
        <div className="mkt-footer-cta-band relative overflow-hidden px-6 pb-14 pt-20 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.1) 0%, transparent 35%)',
            }}
          />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight drop-shadow-sm md:text-4xl">{t('footer.ctaTitle')}</h2>
            <p className="max-w-xl text-sm leading-relaxed text-white/85 md:text-base">{t('footer.ctaDesc')}</p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-primary shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-xl"
              >
                {t('footer.ctaRegister')}
                <ArrowIcon />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20"
              >
                {t('footer.ctaLogin')}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-slate-900 px-6 py-12 text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-1">
            <Link to="/" className="inline-block text-lg font-bold tracking-tight text-white">
              Novel<span className="text-indigo-400"> Agent</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">{t('footer.tagline')}</p>
          </div>

          <FooterLinkGroup title={t('footer.product')} links={productLinks} />
          <FooterLinkGroup title={t('footer.account')} links={accountLinks} />
          <FooterLinkGroup title={t('footer.legal')} links={legalLinks} />
        </div>

        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>
            © {year} {t('brand')} · {t('footer.copyright')}
          </p>
          <p>{t('footer.slogan')}</p>
        </div>
      </div>
    </footer>
  )
}

function FooterLinkGroup({
  title,
  links,
}: {
  title: string
  links: readonly { label: string; to: string }[]
}) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="text-sm text-slate-300 transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
