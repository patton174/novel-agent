import { ChevronRight } from 'lucide-react'
import type { Novel } from '../../types/novel'
import { EditorIcons } from './icons'
import { cn } from '@/lib/utils'
import {
  SIDEBAR_ICON_CELL,
  SIDEBAR_META,
  SIDEBAR_ROW,
  SIDEBAR_TITLE,
} from '@/lib/sidebarLayoutClasses'

/** 侧栏小说卡片：封面/图标 · 标题 · 对话数；hover/focus 显示展开箭头 */
export function NovelSidebarCard({
  novel,
  sessionCountLabel,
  isActive,
  isExpanded,
  onOpenDetail,
  onToggleExpand,
  showExpand = true,
}: {
  novel: Novel
  sessionCount: number
  sessionCountLabel: string
  isActive: boolean
  isExpanded: boolean
  onOpenDetail: () => void
  onToggleExpand: () => void
  showExpand?: boolean
}) {
  return (
    <div
      className={cn(
        SIDEBAR_ROW,
        'group/novel border-2 border-transparent py-1.5 transition-colors',
        isActive ? 'border-foreground bg-neon/25 shadow-[2px_2px_0_0_var(--foreground)]' : 'hover:border-foreground/30 hover:bg-muted/30',
        'focus-within:border-border/60 focus-within:bg-muted/40',
      )}
    >
      <div className={cn(SIDEBAR_ICON_CELL, 'overflow-hidden border-2 border-foreground bg-muted/50')}>
        {novel.coverUrl ? (
          <img src={novel.coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="[&_svg]:size-3.5 [&_svg]:text-muted-foreground">
            <EditorIcons.BookOpen />
          </span>
        )}
      </div>

      <button
        type="button"
        className={cn(
          'flex min-w-0 flex-1 items-baseline border-none bg-transparent py-0.5 text-left font-[inherit] transition-shadow',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        )}
        onClick={(e) => {
          e.stopPropagation()
          onOpenDetail()
        }}
      >
        <span className={SIDEBAR_TITLE}>{novel.title}</span>
        <span className="mx-1 shrink-0 text-[10px] text-muted-foreground/45" aria-hidden>
          ·
        </span>
        <span className={SIDEBAR_META}>{sessionCountLabel}</span>
      </button>

      {showExpand ? (
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? '收起对话' : '展开对话'}
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center border-none bg-transparent text-muted-foreground/70',
            'opacity-0 transition-all duration-200 group-hover/novel:opacity-100 group-focus-within/novel:opacity-100',
            'hover:bg-muted/50 hover:text-foreground',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
            isExpanded && 'opacity-100',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
        >
          <ChevronRight
            className={cn(
              'size-4 transition-transform duration-200 ease-out',
              isExpanded && 'rotate-90',
            )}
          />
        </button>
      ) : null}
    </div>
  )
}
