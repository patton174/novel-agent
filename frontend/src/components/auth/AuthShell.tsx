import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { NovelAiWordmark } from '../marketing/NovelAiWordmark'
import { cn } from '@/lib/utils'

export type AuthShellMarketing = {
  headline: React.ReactNode
  description: string
  footer?: React.ReactNode
}

type Props = {
  title: string
  subtitle: string
  marketing: AuthShellMarketing
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
}

export function AuthShell({ title, subtitle, marketing, children, footer, className }: Props) {
  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex flex-col justify-between w-[46%] xl:w-1/2 bg-primary text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-15%] w-[70%] h-[70%] bg-white/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-indigo-900/30 rounded-full blur-[80px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        </div>

        <motion.div className="relative z-10" {...fadeUp}>
          <Link to="/" className="inline-block hover:opacity-85 transition-opacity duration-200">
            <NovelAiWordmark size="md" animate={false} className="text-white" />
          </Link>
        </motion.div>

        <motion.div className="relative z-10 space-y-6 max-w-lg" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.06 }}>
          <h1 className="text-[2rem] xl:text-4xl font-bold leading-tight tracking-tight">{marketing.headline}</h1>
          <p className="text-base xl:text-lg text-white/80 leading-relaxed">{marketing.description}</p>
          {marketing.footer}
        </motion.div>

        <div className="relative z-10 text-sm text-white/55">
          © {new Date().getFullYear()} Novel Agent
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative">
        <div className="absolute inset-0 lg:hidden pointer-events-none bg-gradient-to-b from-primary/[0.03] to-transparent" />

        <Link to="/" className="lg:hidden mb-8 hover:opacity-85 transition-opacity">
          <NovelAiWordmark size="md" animate={false} />
        </Link>

        <motion.div
          className={cn('w-full max-w-[400px] relative z-10', className)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1.5">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          {footer ? <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div> : null}
        </motion.div>
      </div>
    </div>
  )
}
