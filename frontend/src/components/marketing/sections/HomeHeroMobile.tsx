import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { PixelTypewriterText } from '../pixel/PixelTypewriterText'
import { HomeHeroOrbCta } from './HomeHeroOrbCta'

export function HomeHeroMobile({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation(['marketing', 'common'])
  const reduced = useReducedMotion()

  const kicker = t('home.hero.mobileKicker', { defaultValue: t('home.hero.title') })
  const headline = t('home.hero.titleAccentMobile', { defaultValue: t('home.hero.titleAccent') })
  const subtitle = t('home.hero.subtitleMobile', { defaultValue: t('home.hero.subtitle') })
  const orbLabel = t('home.hero.ctaOrbLabel', { defaultValue: t('home.hero.ctaPrimary') })

  const fade = (delay: number, y = 16) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  return (
    <div className="relative mx-auto flex w-full max-w-lg flex-col items-center px-5 text-center">
      <motion.p
        {...fade(0, 8)}
        className="mb-4 max-w-[18rem] font-mono text-xs font-bold leading-relaxed tracking-wide text-muted-foreground"
      >
        {kicker}
      </motion.p>

      <motion.div {...fade(0.08, 10)} className="relative mb-5 w-full max-w-[19rem] overflow-visible">
        <div className="relative overflow-visible border-2 border-foreground bg-primary/[0.07] px-3 py-4 shadow-[5px_5px_0_0_hsl(var(--foreground))]">
          <span className="absolute -left-1 -top-1 size-2 border border-foreground bg-primary" aria-hidden />
          <span className="absolute -right-1 -top-1 size-2 border border-foreground bg-primary" aria-hidden />
          <span className="absolute -bottom-1 -left-1 size-2 border border-foreground bg-primary" aria-hidden />
          <span className="absolute -bottom-1 -right-1 size-2 border border-foreground bg-primary" aria-hidden />

          <h1 className="sr-only">
            {kicker}
            {headline}
          </h1>
          <PixelTypewriterText
            text={headline}
            cell={14}
            fill
            fillFit
            fillAlign="center"
            dotRange={[0.88, 1.32]}
            glyphGap={1}
            fontWeight={900}
            className="text-primary"
            ariaLabel={headline}
            typewriter={{ cps: 38, delayMs: 280 }}
          />
        </div>
      </motion.div>

      <motion.p
        {...fade(0.16, 8)}
        className="mb-7 max-w-[16rem] font-mono text-[0.8rem] font-medium leading-[1.7] text-foreground/85"
      >
        {subtitle}
      </motion.p>

      <motion.div {...fade(0.24, 8)} className="flex flex-col items-center">
        <HomeHeroOrbCta onClick={onStart} ariaLabel={orbLabel} />
        <p className="mt-4 font-mono text-xs font-bold tracking-wide text-primary">
          {t('home.hero.ctaPrimaryShort', { defaultValue: t('home.hero.ctaPrimary') })}
        </p>
      </motion.div>
    </div>
  )
}
