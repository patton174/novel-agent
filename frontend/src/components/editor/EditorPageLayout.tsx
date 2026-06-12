import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function EditorPageWrapper({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex h-screen overflow-hidden bg-background', className)} {...props} />
}

export function EditorMainContainer({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn(
        'relative z-[1] ml-[284px] flex h-screen min-w-0 flex-1 flex-col overflow-hidden max-md:ml-0',
        className,
      )}
      {...props}
    />
  )
}
