import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { APP_MODAL_FORM, APP_MODAL_READER } from '@/lib/appModalClasses'
import { cn } from '@/lib/utils'

/** Unified modal sizes — editor + dashboard share one shell */
export type AppModalSize = 'confirm' | 'form' | 'settings' | 'todo' | 'detail' | 'memory' | 'reader'

const APP_MODAL_SIZE_CLASS: Record<AppModalSize, string> = {
  confirm: 'sm:max-w-[420px]',
  form: 'sm:max-w-[480px] max-h-[min(720px,90vh)] flex flex-col overflow-hidden',
  settings: 'sm:max-w-[440px] max-h-[min(720px,90vh)] flex flex-col overflow-hidden',
  todo: 'sm:max-w-[520px] max-h-[min(720px,90vh)] flex flex-col overflow-hidden',
  detail: 'sm:max-w-3xl max-h-[min(760px,90vh)] flex flex-col overflow-hidden max-md:h-[100dvh] max-md:max-h-none',
  memory: cn(
    'gap-0 overflow-hidden p-0 sm:max-w-[920px]',
    'h-[min(78vh,700px)] max-h-[min(760px,90vh)]',
    'max-md:flex max-md:h-full max-md:max-h-none max-md:flex-col',
    APP_MODAL_READER,
  ),
  reader: cn('gap-0 sm:max-w-2xl', APP_MODAL_READER),
}

export interface AppModalShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  size?: AppModalSize
  title?: ReactNode
  description?: ReactNode
  /** Custom header (overrides title/description when set) */
  header?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** @default true — mobile full-screen sheet below md */
  mobileFullscreen?: boolean
  /** @default true — top-right X; set false when header provides its own close */
  showCloseButton?: boolean
  testId?: string
}

export function AppModalShell({
  open,
  onOpenChange,
  size = 'settings',
  title,
  description,
  header,
  children,
  className,
  bodyClassName,
  mobileFullscreen = true,
  showCloseButton = true,
  testId,
}: AppModalShellProps) {
  const isInsetBody = size === 'memory'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid={testId}
        mobileFullscreen={mobileFullscreen}
        showCloseButton={showCloseButton}
        className={cn(
          APP_MODAL_FORM,
          APP_MODAL_SIZE_CLASS[size],
          isInsetBody && 'max-md:overflow-hidden',
          size !== 'confirm' && size !== 'reader' && 'grid-rows-[auto_minmax(0,1fr)] !flex !flex-col',
          className,
        )}
      >
        {header ? (
          header
        ) : (
          <DialogHeader className="shrink-0">
            {title ? (
              <DialogTitle>{title}</DialogTitle>
            ) : (
              <DialogTitle className="sr-only">对话框</DialogTitle>
            )}
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        )}
        <div
          className={cn(
            isInsetBody
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'min-h-0 flex-1 overflow-y-auto overscroll-contain',
            bodyClassName,
          )}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
