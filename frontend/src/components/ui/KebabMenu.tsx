import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { MotionPop, type MotionPopPlacement } from '../motion/MotionPop'
import { motionInteractiveClass } from '@/lib/motionClasses'
import {
  KEBAB_MENU_PANEL,
  KEBAB_ROOT,
  kebabMenuItemClass,
  kebabTriggerClass,
  kebabTriggerGhostClass,
} from '@/lib/uiMenuClasses'

export interface KebabMenuItem {
  id: string
  label: string
  danger?: boolean
  onClick: () => void
}

export interface KebabMenuProps {
  items: KebabMenuItem[]
  /** auto：视口空间不足时向上展开（侧栏底部等场景） */
  preferredPlacement?: 'auto' | MotionPopPlacement
  triggerVariant?: 'default' | 'ghost'
  'aria-label'?: string
}

const DotsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="12" cy="19" r="1.75" />
  </svg>
)

const MENU_GAP_PX = 6
const MENU_MIN_WIDTH = 128
const MENU_ESTIMATED_ITEM_HEIGHT = 36

export function KebabMenu({
  items,
  preferredPlacement = 'auto',
  triggerVariant = 'default',
  'aria-label': ariaLabel = '更多操作',
}: KebabMenuProps) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const [menuPlacement, setMenuPlacement] = useState<MotionPopPlacement>('bottom')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const updateMenuPosition = () => {
    const trigger = triggerRef.current
    const menuEl = menuRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const menuHeight =
      menuEl?.offsetHeight ?? Math.max(72, items.length * MENU_ESTIMATED_ITEM_HEIGHT + 12)
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP_PX
    const spaceAbove = rect.top - MENU_GAP_PX

    let placement: MotionPopPlacement = 'bottom'
    if (preferredPlacement === 'top' || preferredPlacement === 'bottom') {
      placement = preferredPlacement
    } else if (spaceBelow < menuHeight && spaceAbove >= spaceBelow) {
      placement = 'top'
    }

    setMenuPlacement(placement)
    setMenuStyle({
      position: 'fixed',
      ...(placement === 'top'
        ? { bottom: window.innerHeight - rect.top + MENU_GAP_PX }
        : { top: rect.bottom + MENU_GAP_PX }),
      right: window.innerWidth - rect.right,
      minWidth: MENU_MIN_WIDTH,
      zIndex: 1300,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
    const raf = requestAnimationFrame(updateMenuPosition)
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open, items.length, preferredPlacement])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const menu = (
    <MotionPop ref={menuRef} open={open} placement={menuPlacement} style={menuStyle}>
      <div id={listId} role="menu" className={KEBAB_MENU_PANEL}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={`${kebabMenuItemClass(item.danger)} ${motionInteractiveClass()}`}
            onClick={() => {
              item.onClick()
              setOpen(false)
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </MotionPop>
  )

  return (
    <div ref={rootRef} className={KEBAB_ROOT}>
      <button
        ref={triggerRef}
        type="button"
        className={`${triggerVariant === 'ghost' ? kebabTriggerGhostClass(open) : kebabTriggerClass(open)} ${motionInteractiveClass()}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={listId}
        title={ariaLabel}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => {
            const next = !v
            if (next) requestAnimationFrame(updateMenuPosition)
            return next
          })
        }}
      >
        <DotsIcon />
      </button>
      {typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </div>
  )
}
