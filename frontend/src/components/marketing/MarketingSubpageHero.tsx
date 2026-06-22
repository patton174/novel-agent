import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { MKT_EYEBROW } from '@/lib/marketingSubpageClasses'
import { PixelTypewriterText } from './pixel/PixelTypewriterText'

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
  const isMobile = useAppMobile()
  const isDark = variant === 'dark'

  const titleCell = isMobile ? 13 : 18
  const accentCell = isMobile ? 16 : 22

  return (
    <section
      className={cn(
        'pixel-hero-bg relative overflow-hidden border-b-2 border-foreground',
        isDark ? 'bg-ink text-background' : 'bg-background text-foreground',
        className,
      )}
    >
      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-24 sm:px-6 md:pb-16 md:pt-28">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl space-y-4 text-center md:space-y-5"
        >
          {eyebrow ? (
            <p className={cn(MKT_EYEBROW, isDark && 'border-background bg-neon text-ink')}>
              <Sparkles className="size-3" strokeWidth={2.5} />
              {eyebrow}
            </p>
          ) : null}

          <div className="space-y-2">
            <h1 className="sr-only">
              {title}
              {titleAccent ?? ''}
            </h1>
            <div className="w-full px-1">
              <PixelTypewriterText
                text={title}
                cell={titleCell}
                fill
                fillFit
                dotRange={isMobile ? [0.85, 1.65] : [1.1, 2.2]}
                fontWeight={800}
                className={isDark ? 'text-background/80' : 'text-foreground'}
                typewriter={{ cps: 30, delayMs: 80 }}
              />
            </div>
            {titleAccent ? (
              <div className="mx-auto w-full overflow-visible border-2 border-foreground bg-primary/10 px-2 py-2 shadow-soft">
                <PixelTypewriterText
                  text={titleAccent}
                  cell={accentCell}
                  fill
                  fillFit
                  dotRange={isMobile ? [0.85, 1.6] : [1.4, 2.8]}
                  fontWeight={900}
                  className="text-primary"
                  typewriter={{ cps: 32, delayMs: 360 }}
                />
              </div>
            ) : null}
          </div>

          {subtitle ? (
            <p
              className={cn(
                'mx-auto max-w-2xl font-mono text-sm leading-relaxed md:text-base',
                isDark ? 'text-background/70' : 'text-muted-foreground',
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
