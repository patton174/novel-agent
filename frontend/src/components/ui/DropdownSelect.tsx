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
import styled from 'styled-components'
import { MotionPop } from '../motion'
import { editorTheme } from '../../styles/editorTheme'
import { editorModalSurface } from '../../styles/editorModal'
import { palette } from '../../styles/theme'
import { motionInteractiveCss, motionMorphCss } from '../motion/motionStyles'

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
      <MenuPanel id={listId} role="listbox">
        {options.map((opt) => {
          const Icon = opt.icon
          const selected = opt.value === value
          return (
            <MenuOption
              key={opt.value}
              type="button"
              role="option"
              aria-selected={selected}
              $active={selected}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {Icon ? <Icon /> : null}
              {opt.label}
            </MenuOption>
          )
        })}
      </MenuPanel>
    </MotionPop>
  )

  return (
    <Root ref={rootRef} $fullWidth={fullWidth}>
      <TriggerButton
        ref={triggerRef}
        type="button"
        disabled={disabled}
        $pill={isPill}
        $size={size}
        $fullWidth={fullWidth}
        $open={open}
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
        <ChevronWrap $open={open}>
          <ChevronDown />
        </ChevronWrap>
      </TriggerButton>
      {typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </Root>
  )
}

const Root = styled.div<{ $fullWidth?: boolean }>`
  position: relative;
  display: ${({ $fullWidth }) => ($fullWidth ? 'flex' : 'inline-flex')};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`

const TriggerButton = styled.button<{
  $pill: boolean
  $size: 'sm' | 'md'
  $fullWidth: boolean
  $open: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid
    ${({ $open }) => ($open ? 'rgba(79, 70, 229, 0.45)' : editorTheme.border)};
  background: ${editorTheme.bgElevated};
  color: ${editorTheme.textSecondary};
  font-family: inherit;
  font-size: ${({ $size }) => ($size === 'sm' ? '0.72rem' : '0.74rem')};
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  box-sizing: border-box;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  height: ${({ $size }) =>
    $size === 'sm' ? `${editorTheme.composerControlHeight}px` : 'auto'};
  padding: ${({ $pill, $size }) => {
    if ($size === 'sm') return '0 0.65rem'
    return $pill ? '0.35rem 0.7rem' : '0.45rem 0.75rem'
  }};
  border-radius: ${({ $pill }) => ($pill ? '999px' : '10px')};
  box-shadow: ${({ $open }) =>
    $open ? editorTheme.shadowInSoft : editorTheme.shadowOutSoft};
  ${motionInteractiveCss}

  svg {
    width: 12px;
    height: 12px;
    color: ${editorTheme.textMuted};
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: ${editorTheme.accentMuted};
    border-color: rgba(79, 70, 229, 0.35);
    color: ${editorTheme.text};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ChevronWrap = styled.span<{ $open: boolean }>`
  display: inline-flex;
  ${motionMorphCss}
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`

const MenuPanel = styled.div`
  padding: 0.35rem;
  background: ${palette.planningActiveBg};
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: ${editorModalSurface.menuShadow};
`

const MenuOption = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.55rem 0.7rem;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(79, 70, 229, 0.45)' : 'transparent')};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? editorTheme.activeBg : 'transparent')};
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ $active }) => ($active ? editorTheme.text : editorTheme.textSecondary)};
  cursor: pointer;
  text-align: left;
  ${motionInteractiveCss}

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: ${({ $active }) => ($active ? editorTheme.accent : editorTheme.textMuted)};
  }

  &:hover {
    background: ${({ $active }) => ($active ? editorTheme.activeBg : editorTheme.accentMuted)};
    color: ${editorTheme.text};
  }

  & + & {
    margin-top: 2px;
  }
`
