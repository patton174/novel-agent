import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { motionIndicatorClass, motionInteractiveClass } from '@/lib/motionClasses'
import {
  MOTION_TAB_INDICATOR,
  MOTION_TAB_TRACK,
  motionTabButtonClass,
  motionTabIconClass,
} from '@/lib/uiMenuClasses'

export interface MotionTabItem<T extends string = string> {
  id: T
  label: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface MotionTabBarProps<T extends string = string> {
  items: MotionTabItem<T>[]
  activeId: T
  onChange: (id: T) => void
  'aria-label'?: string
}

export function MotionTabBar<T extends string = string>({
  items,
  activeId,
  onChange,
  'aria-label': ariaLabel = '标签页',
}: MotionTabBarProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0, height: 0, top: 0 })

  const updateIndicator = () => {
    const track = trackRef.current
    const activeEl = tabRefs.current[activeId]
    if (!track || !activeEl) return
    const trackRect = track.getBoundingClientRect()
    const tabRect = activeEl.getBoundingClientRect()
    setIndicator({
      left: tabRect.left - trackRect.left,
      top: tabRect.top - trackRect.top,
      width: tabRect.width,
      height: tabRect.height,
    })
  }

  useLayoutEffect(() => {
    updateIndicator()
    const track = trackRef.current
    if (!track) return undefined
    const ro = new ResizeObserver(updateIndicator)
    ro.observe(track)
    window.addEventListener('resize', updateIndicator)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activeId, items])

  return (
    <div ref={trackRef} className={MOTION_TAB_TRACK} role="tablist" aria-label={ariaLabel}>
      <div
        aria-hidden
        className={`${MOTION_TAB_INDICATOR} ${motionIndicatorClass()}`}
        style={{
          left: indicator.left,
          top: indicator.top,
          width: indicator.width,
          height: indicator.height,
        }}
      />
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[item.id] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            className={`${motionTabButtonClass(active)} ${motionInteractiveClass()}`}
            onClick={() => onChange(item.id)}
          >
            {item.icon ? (
              <span className={`${motionTabIconClass(active)} ${motionInteractiveClass()}`}>
                {item.icon}
              </span>
            ) : null}
            <span className={motionInteractiveClass()}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
