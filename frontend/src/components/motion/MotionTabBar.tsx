import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import styled from 'styled-components'
import { editorTheme } from '../../styles/editorTheme'
import { motionIndicatorCss, motionInteractiveCss } from './motionStyles'

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
    <Track ref={trackRef} role="tablist" aria-label={ariaLabel}>
      <Indicator
        aria-hidden
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
          <TabButton
            key={item.id}
            ref={(el) => {
              tabRefs.current[item.id] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            $active={active}
            onClick={() => onChange(item.id)}
          >
            {item.icon ? <TabIcon $active={active}>{item.icon}</TabIcon> : null}
            <TabLabel $active={active}>{item.label}</TabLabel>
          </TabButton>
        )
      })}
    </Track>
  )
}

const Track = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.03);
`

const Indicator = styled.div`
  position: absolute;
  border-radius: 10px;
  background: ${editorTheme.activeBg};
  border: 1px solid rgba(79, 70, 229, 0.35);
  box-shadow: ${editorTheme.shadowInSoft};
  ${motionIndicatorCss}
  pointer-events: none;
  z-index: 0;
`

const TabButton = styled.button<{ $active: boolean }>`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.45rem 0.85rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ $active }) => ($active ? editorTheme.text : editorTheme.textSecondary)};
  cursor: pointer;
  ${motionInteractiveCss}

  &:hover:not(:disabled) {
    color: ${editorTheme.text};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const TabIcon = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  ${motionInteractiveCss}
  color: ${({ $active }) => ($active ? editorTheme.accent : editorTheme.textMuted)};

  svg {
    width: 16px;
    height: 16px;
  }
`

const TabLabel = styled.span<{ $active: boolean }>`
  ${motionInteractiveCss}
`
