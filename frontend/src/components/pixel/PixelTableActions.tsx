import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  TableActionBar,
  TableActionButton,
  TableActionIconButton,
  type TableActionLegacyVariant,
  type TableActionTone,
} from '@/components/shared/TableActions'

export function PixelTableActionBar({
  children,
  className,
  align = 'start',
}: {
  children: ReactNode
  className?: string
  align?: 'start' | 'end' | 'center'
}) {
  return (
    <TableActionBar className={className} align={align}>
      {children}
    </TableActionBar>
  )
}

export type PixelTableActionButtonProps = Omit<ComponentProps<typeof Button>, 'size' | 'variant'> & {
  tone?: TableActionTone
  variant?: TableActionLegacyVariant | ComponentProps<typeof Button>['variant']
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  density?: 'compact' | 'form'
}

export function PixelTableActionButton({
  tone,
  variant,
  loading: _loading,
  leftIcon: _leftIcon,
  rightIcon: _rightIcon,
  ...props
}: PixelTableActionButtonProps) {
  return <TableActionButton tone={tone} variant={variant} {...props} />
}

export type PixelTableActionIconButtonProps = Omit<ComponentProps<typeof Button>, 'size' | 'variant'> & {
  tone?: TableActionTone
  variant?: TableActionLegacyVariant | ComponentProps<typeof Button>['variant']
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export function PixelTableActionIconButton({
  tone,
  variant,
  loading: _loading,
  leftIcon: _leftIcon,
  rightIcon: _rightIcon,
  ...props
}: PixelTableActionIconButtonProps) {
  return <TableActionIconButton tone={tone} variant={variant} {...props} />
}
