import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motionTransition } from '@/styles/motion'

export interface MotionSegmentItem<T extends string = string> {
  id: T
  label: ReactNode
  trailing?: ReactNode
  disabled?: boolean
}

export interface MotionSegmentRailProps<T extends string = string> {
  items: MotionSegmentItem<T>[]
  activeId: T
  onChange: (id: T) => void
  'aria-label'?: string
}

export function MotionSegmentRail<T extends string = string>({
  items,
  activeId,
  onChange,
  'aria-label': ariaLabel = '分段选择',
}: MotionSegmentRailProps<T>) {
  const railRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({})
  const [indicator, setIndicator] = useState({ left: 0, top: 0, width: 0, height: 0 })

  const updateIndicator = () => {
    const rail = railRef.current
    const activeEl = itemRefs.current[activeId]
    if (!rail || !activeEl) return
    const railRect = rail.getBoundingClientRect()
    const itemRect = activeEl.getBoundingClientRect()
    setIndicator({
      left: itemRect.left - railRect.left,
      top: itemRect.top - railRect.top,
      width: itemRect.width,
      height: itemRect.height,
    })
  }

  useLayoutEffect(() => {
    updateIndicator()
    const rail = railRef.current
    if (!rail) return undefined
    const ro = new ResizeObserver(updateIndicator)
    ro.observe(rail)
    window.addEventListener('resize', updateIndicator)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activeId, items])

  return (
    <div ref={railRef} role="tablist" aria-label={ariaLabel} className="relative flex flex-col gap-1.5">
      <div
        aria-hidden
        className="pointer-events-none absolute z-0 rounded-[10px] border border-primary/45 bg-primary/10 shadow-inner"
        style={{
          left: indicator.left,
          top: indicator.top,
          width: indicator.width,
          height: indicator.height,
          transition: motionTransition.indicator,
        }}
      />
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            ref={(el) => {
              itemRefs.current[item.id] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            className={cn(
              'relative z-[1] flex w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] border-0 bg-transparent px-2.5 py-2 text-left font-[inherit] transition-colors',
              'hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45',
            )}
            onClick={() => onChange(item.id)}
          >
            <span
              className={cn(
                'text-[12px] transition-colors',
                active ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
              )}
            >
              {item.label}
            </span>
            {item.trailing ? (
              <span
                className={cn(
                  'text-[11px] font-semibold transition-colors',
                  active ? 'text-muted-foreground' : 'text-muted-foreground/60',
                )}
              >
                {item.trailing}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
