import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Sparkles } from 'lucide-react'
import { isLoggedIn } from '../../../utils/auth'
import { MKT_CTA_PRIMARY_LG, MKT_CTA_SECONDARY } from '@/lib/marketingCta'
import { ArrowIcon } from '../icons'
import { PixelTypewriterText } from '../pixel/PixelTypewriterText'
import { MarketingPixelParticles } from '../pixel/MarketingPixelParticles'
import { HomeHeroMobile } from './HomeHeroMobile'
import { cn } from '@/lib/utils'

const TRUST_KEYS_DESKTOP = ['trustFree', 'trustZh', 'trustStream', 'trustMemory'] as const

export function HomeHeroSection() {
  const { t } = useTranslation(['marketing', 'common'])
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const goStart = () => navigate(isLoggedIn() ? '/dashboard' : '/register')

  const scrollToFeasibility = () => {
    document.getElementById('feasibility')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }

  const fade = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  const titleText = t('home.hero.title')
  const accentText = t('home.hero.titleAccent')
  const subtitle = t('home.hero.subtitle')
  const ctaPrimary = t('home.hero.ctaPrimary')
  const ctaSecondary = t('home.hero.ctaSecondary')

  const desktopInner = (
    <div className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
      <motion.div {...fade(0)} className="mb-5 md:mb-8">
        <p className="mb-4 inline-flex items-center gap-2 border-2 border-foreground bg-neon px-2.5 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-widest text-ink shadow-soft sm:mb-4 sm:px-3 sm:text-xs">
          <Sparkles className="size-3" strokeWidth={2.5} />
          {t('home.hero.eyebrow')}
        </p>

        <h1 className="sr-only">
          {titleText}
          {accentText}
        </h1>

        <div className="mb-2 w-full md:mx-auto md:max-w-6xl">
          <PixelTypewriterText
            text={titleText}
            cell={20}
            fill
            fillFit
            fillAlign="center"
            dotRange={[1.5, 3.2]}
            glyphGap={1}
            fontWeight={800}
            className="text-muted-foreground"
            ariaLabel={titleText}
            typewriter={{ cps: 28, delayMs: 120 }}
          />
        </div>

        <div className="w-full md:mx-auto md:max-w-6xl">
          <div className="mx-auto w-full overflow-visible border-2 border-foreground bg-primary/10 px-3 py-4 shadow-soft sm:px-4 sm:py-4 md:max-w-5xl">
            <PixelTypewriterText
              text={accentText}
              cell={28}
              fill
              fillFit
              fillAlign="center"
              dotRange={[1.8, 4]}
              glyphGap={1}
              fontWeight={900}
              className="text-primary"
              ariaLabel={accentText}
              typewriter={{ cps: 30, delayMs: 420 }}
            />
          </div>
        </div>
      </motion.div>

      <motion.p
        {...fade(0.12)}
        className="mx-auto mb-6 max-w-2xl font-mono text-base font-medium leading-relaxed text-foreground/85 sm:mb-8 md:mb-10 md:text-lg"
      >
        {subtitle}
      </motion.p>

      <motion.div
        {...fade(0.2)}
        className="mb-6 flex w-full flex-row flex-nowrap items-stretch justify-center gap-3 sm:mb-8 sm:mx-auto sm:max-w-xl md:mb-10 md:max-w-2xl"
      >
        <button type="button" onClick={goStart} className={cnHeroCta(MKT_CTA_PRIMARY_LG, 'primary')}>
          <span className="truncate">{ctaPrimary}</span>
          <ArrowIcon />
        </button>
        <button type="button" onClick={scrollToFeasibility} className={cnHeroCta(MKT_CTA_SECONDARY, 'secondary')}>
          <span className="truncate">{ctaSecondary}</span>
        </button>
      </motion.div>

      <motion.div {...fade(0.28)} className="flex flex-wrap items-center justify-center gap-2">
        {TRUST_KEYS_DESKTOP.map((key) => (
          <span
            key={key}
            className="mkt-glass-pill px-2.5 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-wide text-foreground md:text-xs"
          >
            {t(`home.hero.${key}`)}
          </span>
        ))}
      </motion.div>
    </div>
  )

  return (
    <section
      id="hero"
      className="relative flex min-h-[100dvh] flex-col overflow-x-clip border-b-2 border-foreground bg-background pt-16 md:border-b-0"
    >
      <MarketingPixelParticles intensity="hero" className="md:opacity-90" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/80 md:from-background/30 md:to-background/70" />

      {/* Mobile: flex-1 fills viewport below fixed nav; scroll hint sits just above section border */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col md:hidden">
        <div className="flex min-h-0 flex-1 items-center justify-center px-0">
          <HomeHeroMobile onStart={goStart} />
        </div>
        <motion.button
          type="button"
          onClick={scrollToFeasibility}
          {...(reduced
            ? {}
            : {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { duration: 0.5, delay: 0.5 },
              })}
          className="hero-mobile-scroll-hint flex shrink-0 flex-col items-center gap-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 font-mono text-[0.65rem] font-medium text-muted-foreground"
        >
          <ChevronDown className="size-4" strokeWidth={2.5} aria-hidden />
          {t('home.hero.scrollHint')}
        </motion.button>
      </div>

      <div className="relative z-10 hidden flex-1 items-center justify-center overflow-visible px-0 py-8 md:flex">
        <div className="mx-auto w-full max-w-6xl">{desktopInner}</div>
      </div>
    </section>
  )
}

function cnHeroCta(base: string, role: 'primary' | 'secondary') {
  const layout =
    role === 'primary'
      ? cn('min-w-0 flex-[2]')
      : cn('min-w-0 flex-[0.75] max-w-[11rem]')
  return cn(
    base,
    'inline-flex items-center justify-center gap-1.5 px-5 py-3.5 text-sm md:text-base',
    'min-h-[3.35rem]',
    layout,
  )
}
