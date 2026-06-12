import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { MotionPop } from '../motion/MotionPop'
import { motionInteractiveClass } from '@/lib/motionClasses'
import {
  KEBAB_MENU_PANEL,
  KEBAB_ROOT,
  kebabMenuItemClass,
  kebabTriggerClass,
} from '@/lib/uiMenuClasses'

export interface KebabMenuItem {
  id: string
  label: string
  danger?: boolean
  onClick: () => void
}

export interface KebabMenuProps {
  items: KebabMenuItem[]
  'aria-label'?: string
}

const DotsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="12" cy="19" r="1.75" />
  </svg>
)

export function KebabMenu({ items, 'aria-label': ariaLabel = '更多操作' }: KebabMenuProps) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const updateMenuPosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
      minWidth: 128,
      zIndex: 1300,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open])

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
    <MotionPop ref={menuRef} open={open} placement="bottom" style={menuStyle}>
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
        className={`${kebabTriggerClass(open)} ${motionInteractiveClass()}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={listId}
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
