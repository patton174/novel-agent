import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/** 邮箱验证等独立结果页 — 与 AuthShell 视觉对齐的紧凑卡片 */
export function AuthResultCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 mkt-grid-bg opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.06] to-transparent"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'mkt-form-card relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/80 bg-surface p-6 text-center shadow-soft',
          className,
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/70 to-violet-500/70"
          aria-hidden
        />
        {children}
      </motion.div>
    </div>
  )
}
