import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  editorDashedButtonClass,
  editorIconButtonClass,
  editorNavButtonClass,
  editorPanelButtonClass,
  editorTabButtonClass,
  editorToggleButtonClass,
} from '@/lib/editorButtonClasses'
import { EditorButtonRoot, sendMorph } from './EditorButton.styles'

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

const SHADCN_EDITOR_VARIANTS = new Set<EditorButtonVariant>([
  'primary',
  'secondary',
  'ghost',
  'close',
  'danger',
  'accent',
  'tool',
  'icon',
  'nav',
  'tab',
  'dashed',
  'panel',
  'toggle',
])

function shadcnVariant(variant: EditorButtonVariant) {
  switch (variant) {
    case 'primary':
    case 'accent':
      return 'default' as const
    case 'secondary':
      return 'secondary' as const
    case 'ghost':
    case 'close':
    case 'nav':
    case 'tab':
    case 'panel':
    case 'toggle':
      return 'ghost' as const
    case 'danger':
      return 'destructive' as const
    case 'tool':
    case 'icon':
    case 'dashed':
      return 'outline' as const
    default:
      return 'default' as const
  }
}

function shadcnSize(variant: EditorButtonVariant, size: EditorButtonSize) {
  if (variant === 'close') return 'icon-sm' as const
  if (variant === 'icon') return 'icon-sm' as const
  if (variant === 'toggle') return 'icon-xs' as const
  if (variant === 'tool') return size === 'sm' ? ('sm' as const) : ('default' as const)
  if (variant === 'nav' || variant === 'panel' || variant === 'dashed') return 'default' as const
  return size === 'sm' ? ('sm' as const) : ('default' as const)
}

function shadcnEditorClass(
  variant: EditorButtonVariant,
  size: EditorButtonSize,
  active: boolean,
  fullWidth: boolean,
  className?: string,
) {
  return cn(
    fullWidth && variant !== 'nav' && variant !== 'panel' && variant !== 'dashed' && 'w-full',
    variant === 'close' && 'size-8 shrink-0 text-lg font-normal leading-none',
    variant === 'icon' && editorIconButtonClass(),
    variant === 'nav' && editorNavButtonClass(active),
    variant === 'tab' && editorTabButtonClass(active),
    variant === 'dashed' && editorDashedButtonClass(size),
    variant === 'panel' && editorPanelButtonClass(),
    variant === 'toggle' && editorToggleButtonClass(),
    className,
  )
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
  className,
  type = 'button',
  ...rest
}: EditorButtonProps) {
  if (SHADCN_EDITOR_VARIANTS.has(variant)) {
    return (
      <Button
        type={type}
        variant={shadcnVariant(variant)}
        size={shadcnSize(variant, size)}
        className={shadcnEditorClass(variant, size, active, fullWidth, className)}
        data-active={active || undefined}
        {...rest}
      >
        {children}
      </Button>
    )
  }

  if (variant === 'send') {
    return (
      <EditorButtonRoot
        $variant={variant}
        $size={size}
        $active={active}
        $fullWidth={fullWidth}
        $streaming={streaming}
        type={type}
        className={className}
        {...rest}
      >
        {children}
      </EditorButtonRoot>
    )
  }

  return (
    <EditorButtonRoot
      $variant={variant}
      $size={size}
      $active={active}
      $fullWidth={fullWidth}
      $streaming={streaming}
      type={type}
      className={className}
      {...rest}
    >
      {children}
    </EditorButtonRoot>
  )
}

export { EditorButtonRoot, sendMorph, buttonVariants }
