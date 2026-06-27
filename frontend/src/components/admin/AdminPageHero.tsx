import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface AdminPageHeroProps {
  /** 方括号内短标签，如「计费管理」 */
  eyebrow: string
  /** 大标题：短词组，可用 / 分隔 */
  title: ReactNode
  action?: ReactNode
  className?: string
}

/** 管理台页面大标题：mono eyebrow + 粗体主标题 + 底部分割线 */
export function AdminPageHero({ eyebrow, title, action, className }: AdminPageHeroProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b-2 border-black pb-6 md:gap-5 md:pb-8',
        action && 'lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          [ {eyebrow} ]
        </span>
        <h1 className="text-3xl font-black uppercase leading-[0.95] tracking-tighter text-ink md:text-4xl lg:text-5xl">
          {title}
        </h1>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
