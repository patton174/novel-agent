import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarketingAmbient } from './MarketingAmbient'

type Variant = 'light' | 'dark' | 'soft'

export function MarketingSubpageHero({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  action,
  variant = 'light',
  className,
  children,
}: {
  eyebrow?: string
  title: ReactNode
  titleAccent?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
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
        variant === 'dark' && 'border-white/10 bg-[#070a14] text-white',
        variant === 'light' && 'bg-gradient-to-b from-white via-slate-50/90 to-white',
        variant === 'soft' && 'bg-gradient-to-br from-primary/[0.04] via-white to-violet-500/[0.06]',
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
          <div className="mkt-grid-bg pointer-events-none absolute inset-0 opacity-60" />
        </>
      )}

      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-16 pt-28 md:flex-row md:items-end md:justify-between md:pb-20">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl space-y-4"
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
          <h1
            className={cn(
              'text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl',
              isDark ? 'text-white' : 'text-foreground',
            )}
          >
            {title}
            {titleAccent ? (
              <>
                <br />
                <span className={reduced ? (isDark ? 'text-indigo-300' : 'text-primary') : 'mkt-gradient-text'}>
                  {titleAccent}
                </span>
              </>
            ) : null}
          </h1>
          {subtitle ? (
            <p
              className={cn(
                'max-w-xl text-base leading-relaxed md:text-lg',
                isDark ? 'text-slate-400' : 'text-muted-foreground',
              )}
            >
              {subtitle}
            </p>
          ) : null}
          {children}
        </motion.div>
        {action ? <div className="shrink-0 self-start md:self-auto">{action}</div> : null}
      </div>
    </section>
  )
}
