import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  FORM_CONTROL_HEIGHT,
  formButtonGhostClass,
  formButtonOutlineClass,
  formControlRowClass,
  formInputClass,
} from './formControlTokens'
import { FormControlRow, FormSearchInput } from './FormControls'

/** @deprecated 使用 FORM_CONTROL_HEIGHT */
export const TOOLBAR_CONTROL_HEIGHT = FORM_CONTROL_HEIGHT

export const toolbarGroupClass = formControlRowClass
export const toolbarInputClass = formInputClass
export const toolbarButtonClass = formButtonOutlineClass

export const toolbarIconButtonClass = cn(
  FORM_CONTROL_HEIGHT,
  'w-9 shrink-0 px-0 shadow-none',
)

export const ToolbarGroup = FormControlRow
export const ToolbarSearchInput = FormSearchInput

export function ToolbarButton({
  className,
  variant = 'outline',
  size = 'lg',
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(formButtonOutlineClass, className)}
      {...props}
    />
  )
}

export function ToolbarIconButton({
  className,
  variant = 'outline',
  size = 'icon-lg',
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        toolbarIconButtonClass,
        variant === 'ghost' && formButtonGhostClass,
        className,
      )}
      {...props}
    />
  )
}
