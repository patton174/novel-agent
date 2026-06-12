import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { MotionPop } from '../motion'
import { editorTheme } from '../../styles/editorTheme'
import { motionInteractiveClass, motionMorphClass } from '@/lib/motionClasses'
import {
  DROPDOWN_MENU_PANEL,
  dropdownChevronClass,
  dropdownMenuOptionClass,
  dropdownRootClass,
  dropdownTriggerClass,
} from '@/lib/uiMenuClasses'

export interface DropdownOption<T extends string = string> {
  value: T
  label: string
  icon?: ComponentType
}

export interface DropdownSelectProps<T extends string = string> {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  triggerLabel?: ReactNode
  placement?: 'top' | 'bottom'
  minWidth?: number
  disabled?: boolean
  appearance?: 'pill' | 'default'
  /** sm：与聊天输入栏托管开关等同高 */
  size?: 'sm' | 'md'
  fullWidth?: boolean
  'aria-label'?: string
}

const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export function DropdownSelect<T extends string = string>({
  value,
  options,
  onChange,
  triggerLabel,
  placement = 'top',
  minWidth = 140,
  disabled = false,
  appearance = 'pill',
  size = 'md',
  fullWidth = false,
  'aria-label': ariaLabel,
}: DropdownSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const active = options.find((o) => o.value === value)
  const isPill = appearance === 'pill'

  const updateMenuPosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.max(rect.width, minWidth)
    if (placement === 'top') {
      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8,
        minWidth: width,
        zIndex: 1300,
      })
    } else {
      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        top: rect.bottom + 8,
        minWidth: width,
        zIndex: 1300,
      })
    }
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
  }, [open, placement, minWidth])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        rootRef.current?.contains(target)
        || menuRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const menu = (
    <MotionPop ref={menuRef} open={open} placement={placement} style={menuStyle}>
      <div id={listId} role="listbox" className={DROPDOWN_MENU_PANEL}>
        {options.map((opt) => {
          const Icon = opt.icon
          const selected = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={selected}
              className={`${dropdownMenuOptionClass(selected)} ${motionInteractiveClass()}`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {Icon ? <Icon /> : null}
              {opt.label}
            </button>
          )
        })}
      </div>
    </MotionPop>
  )

  return (
    <div ref={rootRef} className={dropdownRootClass(fullWidth)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={`${dropdownTriggerClass({ pill: isPill, size, fullWidth, open })} ${motionInteractiveClass()}`}
        style={size === 'sm' ? { height: editorTheme.composerControlHeight } : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={ariaLabel ?? (typeof triggerLabel === 'string' ? triggerLabel : active?.label)}
        onClick={() => {
          setOpen((v) => {
            const next = !v
            if (next) {
              requestAnimationFrame(updateMenuPosition)
            }
            return next
          })
        }}
      >
        <span>{triggerLabel ?? active?.label}</span>
        <span className={`${dropdownChevronClass(open)} ${motionMorphClass()}`}>
          <ChevronDown />
        </span>
      </button>
      {typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </div>
  )
}
