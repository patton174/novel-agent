import { cn } from '@/lib/utils'

const CELL_COUNT = 7

/** 侧栏会话运行态：7 格蛇形方块动画（主题 primary 色） */
export function SessionSquareLoader({ className }: { className?: string }) {
  return (
    <div className={cn('session-square-loader', className)} aria-hidden>
      <div className="session-square-loader__grid">
        {Array.from({ length: CELL_COUNT }, (_, i) => (
          <div key={i} className="session-square-loader__cell" />
        ))}
      </div>
    </div>
  )
}

export function SessionStatusIndicator({
  running,
  active,
  className,
}: {
  running?: boolean
  active?: boolean
  className?: string
}) {
  if (running) {
    return <SessionSquareLoader className={className} />
  }

  return (
    <span
      aria-hidden
      className={cn(
        'size-1 shrink-0 rounded-full bg-foreground/45',
        active ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  )
}
