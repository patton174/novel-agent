import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import styled from 'styled-components'
import { editorTheme } from '../../styles/editorTheme'
import { palette } from '../../styles/theme'
import { motionIndicatorCss, motionInteractiveCss } from './motionStyles'

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
    <Rail ref={railRef} role="tablist" aria-label={ariaLabel}>
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
          <SegmentButton
            key={item.id}
            ref={(el) => {
              itemRefs.current[item.id] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            $active={active}
            onClick={() => onChange(item.id)}
          >
            <SegmentLabel $active={active}>{item.label}</SegmentLabel>
            {item.trailing ? (
              <SegmentTrailing $active={active}>{item.trailing}</SegmentTrailing>
            ) : null}
          </SegmentButton>
        )
      })}
    </Rail>
  )
}

const Rail = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const Indicator = styled.div`
  position: absolute;
  border-radius: 10px;
  background: ${editorTheme.activeBg};
  border: 1px solid rgba(233, 181, 11, 0.45);
  box-shadow: ${editorTheme.shadowInSoft};
  ${motionIndicatorCss}
  pointer-events: none;
  z-index: 0;
`

const SegmentButton = styled.button<{ $active: boolean }>`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding: 0.55rem 0.65rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  font-family: inherit;
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

const SegmentLabel = styled.span<{ $active: boolean }>`
  font-size: 0.78rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ $active }) => ($active ? editorTheme.text : editorTheme.textSecondary)};
  ${motionInteractiveCss}
`

const SegmentTrailing = styled.span<{ $active: boolean }>`
  font-size: 0.68rem;
  font-weight: 600;
  color: ${({ $active }) => ($active ? editorTheme.textMuted : palette.textFaint)};
  ${motionInteractiveCss}
`
