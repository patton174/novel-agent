import type { ReactNode } from 'react'

/** Dashboard / Admin 主内容区统一容器（与 AppPageStack 同宽 6xl，避免路由间宽度跳跃） */
export function AppShellMain({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
    </main>
  )
}
