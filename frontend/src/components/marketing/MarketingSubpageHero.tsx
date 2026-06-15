import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarketingAmbient } from './MarketingAmbient'
import { MarketingStrokeTitle } from './MarketingStrokeTitle'

type Variant = 'light' | 'dark' | 'soft'

export function MarketingSubpageHero({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  variant = 'light',
  className,
  children,
}: {
  eyebrow?: string
  title: string
  titleAccent?: string
  subtitle?: ReactNode
  variant?: Variant
  className?: string
  children?: ReactNode
}) {
  const reduced = useReducedMotion()
  const isDark = variant === 'dark'

  return (
    <section
      className={cn(
        'relative overflow-hidden border-b border-border/50',
        isDark && 'border-white/10 bg-marketing-dark text-white',
        variant === 'light' && 'bg-gradient-to-b from-background via-muted/35 to-background',
        variant === 'soft' && 'bg-gradient-to-br from-primary/[0.05] via-background to-violet-500/[0.06]',
        className,
      )}
    >
      {isDark ? (
        <>
          <div className="mkt-starfield pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.4),transparent_55%)]" />
        </>
      ) : (
        <>
          <MarketingAmbient variant="subtle" />
          <div className="mkt-grid-bg pointer-events-none absolute inset-0 opacity-50 dark:opacity-25" />
        </>
      )}

      <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-28 md:pb-16 md:pt-32">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl space-y-5 text-center md:space-y-6"
        >
          {eyebrow ? (
            <p
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
                isDark
                  ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                  : 'border-primary/20 bg-primary/5 text-primary',
              )}
            >
              <Sparkles className="size-3" />
              {eyebrow}
            </p>
          ) : null}

          <div className="space-y-2">
            <h1 className="sr-only">
              {title}
              {titleAccent ?? ''}
            </h1>
            <MarketingStrokeTitle
              text={title}
              size="subpage"
              variant={isDark ? 'onDark' : 'default'}
              block
            />
            {titleAccent ? (
              <MarketingStrokeTitle
                text={titleAccent}
                size="subpage"
                variant="accent"
                block
              />
            ) : null}
          </div>

          {subtitle ? (
            <p
              className={cn(
                'mx-auto max-w-2xl text-base leading-relaxed md:text-lg',
                isDark ? 'text-slate-400' : 'text-muted-foreground',
              )}
            >
              {subtitle}
            </p>
          ) : null}

          {children ? <div className="pt-2">{children}</div> : null}
        </motion.div>
      </div>
    </section>
  )
}
