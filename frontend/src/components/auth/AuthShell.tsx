import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { NovelAiWordmark } from '../marketing/NovelAiWordmark'
import { cn } from '@/lib/utils'

export type AuthShellMarketing = {
  headline: ReactNode
  description: string
  footer?: ReactNode
}

type Props = {
  title: string
  subtitle: string
  marketing: AuthShellMarketing
  children: ReactNode
  /** 表单下方法律/隐私说明 */
  legal?: ReactNode
  /** 卡片底部切换登录/注册 */
  footer?: ReactNode
  className?: string
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
}

export function AuthShell({ title, subtitle, marketing, children, legal, footer, className }: Props) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="mkt-auth-panel relative hidden w-[42%] flex-col justify-between overflow-hidden p-10 text-white xl:w-[44%] lg:flex">
        <div className="mkt-starfield pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-[15%] -top-[20%] h-[70%] w-[70%] rounded-full bg-white/12 blur-[100px]" />
          <div className="absolute -bottom-[10%] -right-[10%] h-[55%] w-[55%] rounded-full bg-violet-400/20 blur-[80px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>
        <div className="mkt-grid-bg pointer-events-none absolute inset-0 opacity-[0.12]" style={{ maskImage: 'none' }} />

        <motion.div className="relative z-10" {...fadeUp}>
          <Link to="/" className="inline-block transition-opacity duration-200 hover:opacity-85">
            <NovelAiWordmark size="md" animate={false} className="text-white" />
          </Link>
        </motion.div>

        <motion.div
          className="relative z-10 max-w-md space-y-4"
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.06 }}
        >
          <h1 className="text-2xl font-bold leading-tight tracking-tight xl:text-3xl">{marketing.headline}</h1>
          <p className="text-sm leading-relaxed text-white/80 xl:text-base">{marketing.description}</p>
          {marketing.footer}
        </motion.div>

        <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
          <span>© {new Date().getFullYear()} Novel AI</span>
          <Link to="/privacy" className="hover:text-white/80 hover:underline">
            隐私
          </Link>
          <Link to="/terms" className="hover:text-white/80 hover:underline">
            协议
          </Link>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-violet-500/[0.05] lg:hidden" />
        <div className="mkt-grid-bg pointer-events-none absolute inset-0 opacity-35 lg:opacity-20" />

        <Link to="/" className="relative z-10 mb-6 transition-opacity hover:opacity-85 lg:hidden">
          <NovelAiWordmark size="sm" animate={false} />
        </Link>

        <motion.div
          className={cn('relative z-10 w-full max-w-[400px]', className)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mkt-form-card rounded-2xl border border-border/70 bg-surface/95 p-6 shadow-[0_16px_48px_-20px_rgba(79,70,229,0.22)] backdrop-blur-md sm:p-7">
            <div className="mb-5">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            </div>

            {children}

            {legal ? <div className="mt-5 border-t border-border/60 pt-4">{legal}</div> : null}

            {footer ? (
              <div className="mt-4 text-center text-xs text-muted-foreground">{footer}</div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
