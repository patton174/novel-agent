import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 侧栏中部：聊天历史 ↔ 章节目录 交叉淡入，保持挂载避免切换卡顿 */
export function SidebarContentSwitch({
  mode,
  chat,
  story,
  className,
}: {
  mode: 'chat' | 'story'
  chat: ReactNode
  story: ReactNode
  className?: string
}) {
  const showChat = mode === 'chat'

  return (
    <div className={cn('relative min-h-[120px] flex-1', className)}>
      <div
        aria-hidden={!showChat}
        className={cn(
          'absolute inset-0 overflow-y-auto transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[opacity,transform] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          showChat
            ? 'pointer-events-auto z-[1] translate-x-0 opacity-100'
            : 'pointer-events-none z-0 -translate-x-1.5 opacity-0',
        )}
      >
        {chat}
      </div>
      <div
        aria-hidden={showChat}
        className={cn(
          'absolute inset-0 flex min-h-0 flex-col overflow-hidden transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[opacity,transform]',
          !showChat
            ? 'pointer-events-auto z-[1] translate-x-0 opacity-100'
            : 'pointer-events-none z-0 translate-x-1.5 opacity-0',
        )}
      >
        {story}
      </div>
    </div>
  )
}
