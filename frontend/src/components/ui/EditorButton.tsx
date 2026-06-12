import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EditorButtonRoot } from './EditorButton.styles'

export type EditorButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'icon'
  | 'nav'
  | 'tab'
  | 'accent'
  | 'toggle'
  | 'close'
  | 'dashed'
  | 'choice'
  | 'panel'
  | 'tool'
  | 'chapter'
  | 'volume'
  | 'send'
  | 'segment'

export type EditorButtonSize = 'sm' | 'md'

export interface EditorButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: EditorButtonVariant
  size?: EditorButtonSize
  active?: boolean
  fullWidth?: boolean
  streaming?: boolean
  children?: ReactNode
}

export function EditorSendIconLayer({
  visible,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { visible: boolean }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out',
        visible ? 'scale-100 opacity-100' : 'scale-[0.72] opacity-0',
        className,
      )}
      aria-hidden={!visible}
      {...props}
    />
  )
}

export function EditorButton({
  variant = 'secondary',
  size = 'md',
  active = false,
  fullWidth = false,
  streaming = false,
  children,
  type = 'button',
  ...rest
}: EditorButtonProps) {
  return (
    <EditorButtonRoot
      $variant={variant}
      $size={size}
      $active={active}
      $fullWidth={fullWidth}
      $streaming={streaming}
      type={type}
      {...rest}
    >
      {children}
    </EditorButtonRoot>
  )
}

export { EditorButtonRoot, sendMorph } from './EditorButton.styles'
