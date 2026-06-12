import type { ReactNode } from 'react'

/** Dashboard / Admin 主内容区统一容器 */
export function AppShellMain({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-muted/30">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">{children}</div>
    </main>
  )
}
