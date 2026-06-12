import { cn } from '@/lib/utils'

export function toolIconSvgClass(animate?: boolean, className?: string) {
  return cn('block shrink-0', animate && 'tool-icon-animate', className)
}
