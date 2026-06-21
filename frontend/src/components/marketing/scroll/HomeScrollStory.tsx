import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { MarketingChatScene } from '../demo/MarketingChatScene'
import { PixelText } from '../pixel/PixelText'
import { useMarketingStoryReveal } from './useMarketingStoryReveal'
import { CURSOR_LANDING_ROOT } from '@/lib/cursorLandingClasses'
import { marketingInViewMotion } from '../motion/marketingInViewMotion'

const ACTS = [
  { id: 'story-context', scene: 'think' as const, layout: 'copy-left' as const, act: '01', key: '1' },
  { id: 'story-subagent', scene: 'subagent' as const, layout: 'copy-right' as const, act: '02', key: '2' },
  { id: 'story-stream', scene: 'stream' as const, layout: 'copy-left' as const, act: '03', key: '3' },
]

export function HomeScrollStory() {
  const { t } = useTranslation('marketing')
  const reduced = useReducedMotion()
  const isMobile = useAppMobile()
  const rootRef = useRef<HTMLDivElement>(null)
  useMarketingStoryReveal(rootRef)
  const acts = isMobile ? ACTS.slice(0, 1) : ACTS
  const introReveal = marketingInViewMotion({
    isMobile,
    reduced: Boolean(reduced),
    desktopInitial: { opacity: 0, y: 16 },
    desktopWhileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-10% 0px' },
    transition: { duration: 0.45 },
  })

  return (
    <div id="demo-story" className="scroll-mt-16">
      <section className="border-t-2 border-foreground bg-background px-6 py-20 md:py-24">
        <motion.div
          {...introReveal}
          className="relative mx-auto max-w-6xl"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 border-2 border-foreground bg-neon px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-soft">
              <Sparkles className="size-3" strokeWidth={2.5} />
              {t('home.story.introEyebrow')}
            </p>
            <h2 className="mb-3">
              <PixelText
                text={t('home.story.introTitle')}
                cell={20}
                fill
                dotRange={[1.5, 3.5]}
                fontWeight={900}
                className="text-ink"
              />
            </h2>
            <p className="font-mono text-sm leading-relaxed text-muted-foreground md:text-base">
              {t('home.story.introSubtitle')}
            </p>
          </div>
        </motion.div>
      </section>

      <div ref={rootRef} className={CURSOR_LANDING_ROOT} data-scroll-story>
        {acts.map(({ id, scene, layout, act, key }) => {
          const prefix = `home.story.acts.${key}`
          const points = [1, 2, 3].map((n) => ({
            highlight: t(`${prefix}.points.${n}.highlight`),
            text: t(`${prefix}.points.${n}.text`),
          }))
          return (
            <MarketingChatScene
              key={id}
              id={id}
              scene={scene}
              layout={layout}
              act={act}
              label={t(`${prefix}.label`)}
              title={t(`${prefix}.title`)}
              titleAccent={t(`${prefix}.titleAccent`)}
              lead={t(`${prefix}.lead`)}
              points={points}
            />
          )
        })}
      </div>
    </div>
  )
}
