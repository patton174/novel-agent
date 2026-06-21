import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { isLoggedIn } from '../../../utils/auth'
import { MKT_CTA_PRIMARY_LG } from '@/lib/marketingCta'
import { ArrowIcon } from '../icons'
import { PixelText } from '../pixel/PixelText'

const TRUST_KEYS = ['trustFree', 'trustZh', 'trustStream', 'trustMemory'] as const

export function HomeHeroSection() {
  const { t } = useTranslation(['marketing', 'common'])
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const goStart = () => navigate(isLoggedIn() ? '/dashboard' : '/register')

  const fade = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  const inner = (
    <div className="relative mx-auto max-w-6xl px-6 text-left md:text-center">
      <motion.div {...fade(0)} className="mb-8 space-y-3">
        <h1 className="sr-only">
          {t('home.hero.title')}
          {t('home.hero.titleAccent')}
        </h1>
        <PixelText
          text={t('home.hero.title')}
          cell={28}
          fill
          dotRange={[2, 5]}
          fontWeight={900}
          className="text-ink"
          ariaLabel={t('home.hero.title')}
        />
        <PixelText
          text={t('home.hero.titleAccent')}
          cell={28}
          fill
          dotRange={[2, 5]}
          fontWeight={900}
          className="text-primary"
          ariaLabel={t('home.hero.titleAccent')}
        />
      </motion.div>

      <motion.p
        {...fade(0.12)}
        className="mx-auto mb-10 max-w-2xl font-mono text-base leading-relaxed text-muted-foreground md:text-lg"
      >
        {t('home.hero.subtitle')}
      </motion.p>

      <motion.div
        {...fade(0.2)}
        className="mb-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
      >
        <button type="button" onClick={goStart} className={MKT_CTA_PRIMARY_LG}>
          {t('common:cta.startCreating')}
          <ArrowIcon />
        </button>
      </motion.div>

      <motion.div
        {...fade(0.28)}
        className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:mb-4"
      >
        {TRUST_KEYS.map((key) => (
          <span
            key={key}
            className="mkt-glass-pill px-3 py-1 font-mono text-xs font-bold uppercase tracking-wide text-foreground"
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
      className="pixel-grid-bg-faint relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-0 pb-8 pt-20 md:pt-24"
    >
      <div className="w-full">{inner}</div>
    </section>
  )
}
