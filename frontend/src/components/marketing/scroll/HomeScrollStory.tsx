import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MarketingChatScene } from '../demo/MarketingChatScene'
import { useMarketingStoryReveal } from './useMarketingStoryReveal'
import { CursorLandingRoot } from '../../../styles/surfaces/cursorLanding'

const ACTS = [
  { id: 'story-context', scene: 'orchestrate' as const, layout: 'copy-left' as const, act: '01', key: '1' },
  { id: 'story-subagent', scene: 'subagent' as const, layout: 'copy-right' as const, act: '02', key: '2', wash: true },
  { id: 'story-stream', scene: 'stream' as const, layout: 'copy-left' as const, act: '03', key: '3' },
]

export function HomeScrollStory() {
  const { t } = useTranslation('marketing')
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  useMarketingStoryReveal(rootRef)

  return (
    <div id="demo-story" className="scroll-mt-16">
      <section className="relative overflow-hidden border-t border-border/40 bg-gradient-to-b from-slate-50 to-white px-6 py-16 md:py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.45 }}
          className="relative mx-auto max-w-6xl"
        >
          <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="size-3" />
            {t('home.story.introEyebrow')}
          </p>
          <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-4xl">
            {t('home.story.introTitle')}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            {t('home.story.introSubtitle')}
          </p>
          </div>
        </motion.div>
      </section>

      <CursorLandingRoot ref={rootRef} data-scroll-story>
        {ACTS.map(({ id, scene, layout, act, key, wash }) => {
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
              wash={wash}
            />
          )
        })}
      </CursorLandingRoot>
    </div>
  )
}
