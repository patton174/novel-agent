import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import styled from 'styled-components'
import { createPortal } from 'react-dom'
import { MotionPop } from '../motion/MotionPop'
import { editorModalSurface } from '../../styles/editorModal'
import { editorTheme } from '../../styles/editorTheme'
import { palette } from '../../styles/theme'
import { motionInteractiveCss } from '../motion/motionStyles'

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
      <MenuPanel id={listId} role="menu">
        {items.map((item) => (
          <MenuItem
            key={item.id}
            type="button"
            role="menuitem"
            $danger={item.danger}
            onClick={() => {
              item.onClick()
              setOpen(false)
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </MenuPanel>
    </MotionPop>
  )

  return (
    <Root ref={rootRef}>
      <Trigger
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={listId}
        $open={open}
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
      </Trigger>
      {typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </Root>
  )
}

const Root = styled.div`
  display: inline-flex;
  flex-shrink: 0;
`

const Trigger = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: ${({ $open }) => ($open ? editorTheme.accentMuted : 'transparent')};
  color: ${editorTheme.textMuted};
  cursor: pointer;
  ${motionInteractiveCss}

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: ${editorTheme.accentMuted};
    color: ${editorTheme.text};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.45);
    color: ${editorTheme.text};
  }
`

const MenuPanel = styled.div`
  padding: 0.3rem;
  background: ${palette.planningActiveBg};
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  box-shadow: ${editorModalSurface.menuShadow};
`

const MenuItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  display: block;
  padding: 0.5rem 0.7rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  text-align: left;
  color: ${({ $danger }) => ($danger ? editorTheme.error : editorTheme.text)};
  cursor: pointer;
  ${motionInteractiveCss}

  &:hover {
    background: ${({ $danger }) =>
      $danger ? editorTheme.errorBg : editorTheme.accentMuted};
  }
`
