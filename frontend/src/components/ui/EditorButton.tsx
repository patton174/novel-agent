import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { editorTheme } from '@/styles/theme'
import {
  editorChapterButtonClass,
  editorChoiceButtonClass,
  editorDashedButtonClass,
  editorIconButtonClass,
  editorNavButtonClass,
  editorPanelButtonClass,
  editorSegmentButtonClass,
  editorSendButtonClass,
  editorTabButtonClass,
  editorToggleButtonClass,
  editorVolumeButtonClass,
} from '@/lib/editorButtonClasses'
import {
  editorPrimaryButtonClass,
  editorSecondaryButtonClass,
} from '@/lib/editorPixelClasses'

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
    case 'chapter':
    case 'volume':
      return 'ghost' as const
    case 'danger':
      return 'destructive' as const
    case 'tool':
    case 'icon':
    case 'dashed':
    case 'choice':
    case 'segment':
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
  if (
    variant === 'nav' ||
    variant === 'panel' ||
    variant === 'dashed' ||
    variant === 'choice' ||
    variant === 'chapter' ||
    variant === 'volume' ||
    variant === 'segment'
  ) {
    return 'default' as const
  }
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
    'rounded-none',
    variant === 'close' && 'size-8 shrink-0 text-lg font-normal leading-none',
    variant === 'primary' && editorPrimaryButtonClass(),
    variant === 'accent' && editorPrimaryButtonClass(),
    variant === 'secondary' && editorSecondaryButtonClass(),
    variant === 'danger' &&
      'border-2 border-foreground bg-destructive text-destructive-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:bg-destructive/90',
    variant === 'ghost' && 'border-2 border-transparent bg-transparent shadow-none hover:bg-muted/40',
    variant === 'tool' && editorSecondaryButtonClass('h-auto px-2.5 py-1.5 normal-case'),
    variant === 'icon' && editorIconButtonClass(),
    variant === 'nav' && editorNavButtonClass(active),
    variant === 'tab' && editorTabButtonClass(active),
    variant === 'dashed' && editorDashedButtonClass(size),
    variant === 'panel' && editorPanelButtonClass(),
    variant === 'toggle' && editorToggleButtonClass(),
    variant === 'choice' && editorChoiceButtonClass(active),
    variant === 'chapter' && editorChapterButtonClass(active),
    variant === 'volume' && editorVolumeButtonClass(),
    variant === 'segment' && editorSegmentButtonClass(active),
    variant === 'chapter' &&
      'rounded-none shadow-none focus-visible:border-transparent focus-visible:ring-0',
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
  if (variant === 'send') {
    const sendSize = editorTheme.composerControlHeight
    return (
      <button
        type={type}
        className={editorSendButtonClass(streaming, className)}
        style={{
          width: sendSize,
          height: sendSize,
          minWidth: sendSize,
          minHeight: sendSize,
        }}
        {...rest}
      >
        {children}
      </button>
    )
  }

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

export { buttonVariants }
