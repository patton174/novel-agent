import { cn } from '@/lib/utils'

export function AuthSpinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'size-3.5 border-[1.5px]' : 'size-4 border-2'
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-primary/25 border-t-primary',
        dim,
        className,
      )}
      aria-hidden
    />
  )
}
