import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { NovelAiPixelWordmark } from '../marketing/pixel/NovelAiPixelWordmark'
import { PixelText } from '../marketing/pixel/PixelText'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

import { BRAND_NAME } from '@/lib/brand'

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
  const { t } = useTranslation(['auth'])
  return (
    <div className="flex min-h-screen bg-background">
      {/* 左侧营销面板：墨黑实色 + 2px 黑边 + 硬错位投影，白 logo + 荧光绿点缀，避免与 logo 蓝色撞色 */}
      <div className="relative hidden w-[42%] flex-col justify-between border-r-2 border-foreground bg-ink p-10 text-white shadow-soft xl:w-[44%] lg:flex">
        <motion.div className="relative z-10" {...fadeUp}>
          <Link to="/" className="inline-block transition-opacity duration-200 hover:opacity-85">
            <NovelAiPixelWordmark size="lg" className="text-white" accent="#ffd166" />
          </Link>
        </motion.div>

        <motion.div
          className="relative z-10 max-w-md space-y-5"
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.06 }}
        >
          <span className="inline-flex items-center border-2 border-white/30 bg-white/5 px-3 py-1 text-neon">
            <PixelText
              text="[ NOVEL AGENT ]"
              size="sm"
              fontWeight={800}
              fill
              dotRange={[1, 2]}
            />
          </span>
          <h1 className="text-3xl font-black uppercase leading-[0.95] tracking-tighter text-white xl:text-4xl">{marketing.headline}</h1>
          <p className="font-mono text-sm leading-relaxed text-white/75 xl:text-base">{marketing.description}</p>
          {marketing.footer}
        </motion.div>

        <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-white/50">
          <span>© {new Date().getFullYear()} {BRAND_NAME}</span>
          <Link to="/privacy" className="hover:text-neon hover:underline">
            {t('auth:shell.privacy')}
          </Link>
          <Link to="/terms" className="hover:text-neon hover:underline">
            {t('auth:shell.terms')}
          </Link>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <motion.div
          className={cn('relative z-10 w-full max-w-[440px]', className)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link to="/" className="mb-6 inline-block transition-opacity hover:opacity-85 lg:hidden">
            <NovelAiPixelWordmark size="sm" />
          </Link>

          {/* 表单卡片：2px 边 + 硬错位投影，直角 */}
          <div className="border-2 border-foreground bg-surface p-6 shadow-soft sm:p-8">
            <div className="mb-6 border-b-2 border-foreground pb-4">
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">{title}</h2>
              <p className="mt-1.5 font-mono text-xs text-muted-foreground">{subtitle}</p>
            </div>

            {children}

            {legal ? <div className="mt-5 border-t-2 border-foreground/20 pt-4">{legal}</div> : null}

            {footer ? (
              <div className="mt-4 text-center font-mono text-xs text-muted-foreground">{footer}</div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
