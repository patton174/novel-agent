import type { ComponentProps, ReactNode } from 'react'
import { AppModalShell, type AppModalShellProps } from '@/components/ui/AppModalShell'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAppMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

type SheetSide = 'top' | 'right' | 'bottom' | 'left'

export interface AppSheetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: ReactNode
  description?: ReactNode
  header?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  testId?: string
  showCloseButton?: boolean
  sheetSide?: SheetSide
  sheetClassName?: string
  sheetHeaderClassName?: string
  modalSize?: AppModalShellProps['size']
  modalClassName?: string
  modalBodyClassName?: string
}

export function AppSheetModal({
  open,
  onOpenChange,
  title,
  description,
  header,
  children,
  className,
  bodyClassName,
  testId,
  showCloseButton = true,
  sheetSide = 'bottom',
  sheetClassName,
  sheetHeaderClassName,
  modalSize = 'settings',
  modalClassName,
  modalBodyClassName,
}: AppSheetModalProps) {
  const isMobile = useAppMobile()

  if (!isMobile) {
    return (
      <AppModalShell
        open={open}
        onOpenChange={onOpenChange}
        size={modalSize}
        title={title}
        description={description}
        header={header}
        className={cn(className, modalClassName)}
        bodyClassName={cn(bodyClassName, modalBodyClassName)}
        showCloseButton={showCloseButton}
        testId={testId}
      >
        {children}
      </AppModalShell>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={sheetSide}
        data-testid={testId}
        showCloseButton={showCloseButton}
        className={cn(
          'max-h-[min(92dvh,860px)] w-full gap-0 rounded-t-2xl border-border px-0 pb-0 pt-0',
          sheetSide !== 'bottom' && 'rounded-none',
          className,
          sheetClassName,
        )}
      >
        {header ? (
          header
        ) : title || description ? (
          <SheetHeader className={cn('border-b border-border px-5 py-4', sheetHeaderClassName)}>
            {title ? <SheetTitle>{title}</SheetTitle> : null}
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
        ) : null}
        <div className={cn('min-h-0 overflow-y-auto px-5 py-4', bodyClassName)}>{children}</div>
      </SheetContent>
    </Sheet>
  )
}

export type AppSheetModalSheetProps = ComponentProps<typeof SheetContent>
