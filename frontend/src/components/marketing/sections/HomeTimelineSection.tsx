import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Brain, GitBranch, PenLine, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MarketingAmbient } from '../MarketingAmbient'

const ITEMS: { icon: LucideIcon; key: string }[] = [
  { icon: Brain, key: 'memory' },
  { icon: GitBranch, key: 'orchestrate' },
  { icon: PenLine, key: 'stream' },
  { icon: ShieldCheck, key: 'resume' },
]

function TimelineNode({
  index,
  side,
  icon: Icon,
  title,
  desc,
  reduced,
}: {
  index: number
  side: 'left' | 'right'
  icon: LucideIcon
  title: string
  desc: string
  reduced: boolean
}) {
  const xFrom = side === 'left' ? -56 : 56

  return (
    <div
      className={`relative flex min-h-[6.5rem] items-center ${
        side === 'left' ? 'justify-start md:pr-[52%]' : 'justify-end md:pl-[52%]'
      }`}
    >
      <motion.div
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        initial={reduced ? false : { scale: 0.4, opacity: 0.3 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.6, margin: '0px 0px -15% 0px' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="size-4 rounded-full border-2 border-primary bg-background shadow-[0_0_0_6px_rgba(79,70,229,0.18)]" />
      </motion.div>

      <motion.div
        aria-hidden
        className={`absolute top-1/2 hidden h-0.5 -translate-y-1/2 md:block ${
          side === 'left'
            ? 'right-1/2 mr-4 w-[calc(50%-1.75rem)] origin-right bg-gradient-to-l from-primary to-primary/20'
            : 'left-1/2 ml-4 w-[calc(50%-1.75rem)] origin-left bg-gradient-to-r from-primary/20 to-primary'
        }`}
        initial={reduced ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.5, margin: '0px 0px -15% 0px' }}
        transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.article
        initial={reduced ? false : { opacity: 0, x: xFrom, filter: 'blur(8px)' }}
        whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.45, margin: '0px 0px -12% 0px' }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className={`group mkt-card-lift w-full max-w-md rounded-2xl border border-border/60 bg-white/90 p-6 shadow-[0_12px_48px_-16px_rgba(79,70,229,0.18)] backdrop-blur-sm md:w-[calc(50%-2.75rem)] ${
          side === 'left' ? 'md:mr-auto' : 'md:ml-auto'
        }`}
      >
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-indigo-500/5 ring-1 ring-primary/15 transition group-hover:from-primary/25 group-hover:ring-primary/25">
            <Icon className="size-5 text-primary" strokeWidth={1.75} />
          </div>
          <span className="text-[11px] font-semibold tabular-nums tracking-widest text-muted-foreground/50">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <h3 className="mb-1.5 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </motion.article>
    </div>
  )
}

export function HomeTimelineSection() {
  const { t } = useTranslation('marketing')
  const reduced = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start 0.85', 'end 0.15'],
  })
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section
      id="capabilities"
      className="relative scroll-mt-16 overflow-hidden border-t border-border/40 bg-gradient-to-b from-[#fafaf8] via-white to-[#f8fafc] px-6 py-20 md:py-28"
    >
      <MarketingAmbient variant="section" />
      <div className="relative mx-auto mb-14 max-w-3xl text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
          {t('home.timeline.eyebrow')}
        </p>
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {t('home.timeline.title')}
        </h2>
        <p className="text-sm text-muted-foreground md:text-base">{t('home.timeline.subtitle')}</p>
      </div>

      <div ref={trackRef} className="relative mx-auto max-w-4xl pb-4">
        <div aria-hidden className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-border/80" />
        <motion.div
          aria-hidden
          className="absolute bottom-0 left-1/2 top-0 w-1 -translate-x-1/2 origin-top rounded-full bg-gradient-to-b from-indigo-400 via-primary to-violet-600 shadow-[0_0_28px_rgba(79,70,229,0.45)]"
          style={reduced ? { scaleY: 1 } : { scaleY: lineScale }}
        />

        <div className="relative space-y-14 md:space-y-20">
          {ITEMS.map((item, index) => {
            const side = index % 2 === 0 ? 'left' : 'right'
            return (
              <TimelineNode
                key={item.key}
                index={index}
                side={side}
                icon={item.icon}
                title={t(`home.timeline.items.${item.key}.title`)}
                desc={t(`home.timeline.items.${item.key}.desc`)}
                reduced={Boolean(reduced)}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
