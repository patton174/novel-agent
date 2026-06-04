import type { ButtonHTMLAttributes, ReactNode } from 'react'
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

export { EditorButtonRoot, EditorSendIconLayer, sendMorph } from './EditorButton.styles'
