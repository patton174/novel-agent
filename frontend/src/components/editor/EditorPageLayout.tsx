import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { EDITOR_PIXEL_ROOT } from '@/lib/editorPixelClasses'
import { useAppMobile } from '@/hooks/useMediaQuery'

export function EditorPageWrapper({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(EDITOR_PIXEL_ROOT, 'flex h-screen w-full overflow-hidden', className)} {...props} />
}

export function EditorMainContainer({ className, ...props }: HTMLAttributes<HTMLElement>) {
  const isMobile = useAppMobile()

  return (
    <main
      className={cn(
        'relative z-[1] flex h-screen w-full min-w-0 flex-1 flex-col overflow-hidden bg-background',
        isMobile
          ? 'ml-0 border-l-0 bg-gradient-to-br from-background via-background to-muted/30'
          : 'ml-[284px] border-l-2 border-foreground',
        className,
      )}
      {...props}
    />
  )
}
