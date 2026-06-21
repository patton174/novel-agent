import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Dashboard / Admin 主内容区统一容器。
 *  仪表盘性质页面应吃满侧栏右侧区域，故上限放宽到 1600px（大屏少留白、小屏自动收缩）。 */
export function AppShellMain({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn('flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-muted/30', className)}>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8 md:py-8">{children}</div>
    </main>
  )
}
