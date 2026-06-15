import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { isLoggedIn } from '../../../utils/auth'
import { MKT_CTA_PRIMARY_LG, MKT_CTA_SECONDARY } from '@/lib/marketingCta'
import { ArrowIcon } from '../icons'
import { MarketingStrokeTitle } from '../MarketingStrokeTitle'

const TRUST_KEYS = ['trustFree', 'trustZh', 'trustStream', 'trustMemory'] as const

export function HomeHeroSection() {
  const { t } = useTranslation(['marketing', 'common'])
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const goStart = () => navigate(isLoggedIn() ? '/dashboard' : '/register')
  const scrollToStory = () => {
    document.getElementById('demo-story')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const fade = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  const inner = (
    <div className="relative mx-auto max-w-6xl px-6 text-center">
      <motion.p
        {...fade(0)}
        className="mb-5 inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-surface/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary shadow-sm backdrop-blur-md"
      >
        <Sparkles className="size-3.5" />
        {t('home.hero.eyebrow')}
      </motion.p>

      <motion.div {...fade(0.08)} className="mb-6 space-y-1">
        <h1 className="sr-only">
          {t('home.hero.title')}
          {t('home.hero.titleAccent')}
        </h1>
        <MarketingStrokeTitle text={t('home.hero.title')} size="hero" variant="default" block />
        <MarketingStrokeTitle text={t('home.hero.titleAccent')} size="hero" variant="accent" block />
      </motion.div>

      <motion.p
        {...fade(0.16)}
        className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
      >
        {t('home.hero.subtitle')}
      </motion.p>

      <motion.div
        {...fade(0.24)}
        className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
      >
        <button type="button" onClick={goStart} className={MKT_CTA_PRIMARY_LG}>
          {t('common:cta.startCreating')}
          <ArrowIcon />
        </button>
        <button type="button" onClick={scrollToStory} className={MKT_CTA_SECONDARY}>
          {t('home.hero.ctaSecondary')}
        </button>
      </motion.div>

      <motion.div
        {...fade(0.32)}
        className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:mb-4"
      >
        {TRUST_KEYS.map((key) => (
          <span key={key} className="mkt-glass-pill rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
            {t(`home.hero.${key}`)}
          </span>
        ))}
      </motion.div>

      <motion.button
        {...fade(0.4)}
        type="button"
        onClick={scrollToStory}
        className="mx-auto mt-4 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline sm:mt-6"
        aria-label={t('home.hero.scrollHint')}
      >
        {t('home.hero.scrollHint')}
      </motion.button>
    </div>
  )

  return (
    <section
      id="hero"
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-0 pb-8 pt-20 md:pt-24"
    >
      <div className="w-full">{inner}</div>
    </section>
  )
}
