import type { HTMLAttributes } from 'react'
import { CHAT_MESSAGE_SURFACE, CHAT_MESSAGE_SURFACE_BODY } from '@/lib/chatMessageSurfaceClasses'
import { cn } from '@/lib/utils'

export function ChatMessageSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(CHAT_MESSAGE_SURFACE, className)} {...props} />
}

export function ChatMessageSurfaceBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(CHAT_MESSAGE_SURFACE_BODY, className)} {...props} />
}
