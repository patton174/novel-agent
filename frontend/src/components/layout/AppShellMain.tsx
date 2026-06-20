import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Dashboard / Admin 主内容区统一容器（与 AppPageStack 同宽 6xl，避免路由间宽度跳跃） */
export function AppShellMain({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn('flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-muted/30', className)}>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
    </main>
  )
}
