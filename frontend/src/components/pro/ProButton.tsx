import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const proButtonVariants = cva('pro-btn inline-flex items-center justify-center gap-2 rounded-none border-2 border-black bg-clip-padding font-mono text-sm font-bold uppercase tracking-wider transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none [&_svg]:shrink-0', {
  variants: {
    variant: {
      primary: 'pro-btn--primary bg-primary text-primary-foreground shadow-soft hover:bg-neon hover:text-ink',
      secondary: 'pro-btn--secondary bg-white text-ink shadow-soft hover:bg-neon',
      ghost: 'pro-btn--ghost border-transparent bg-transparent text-ink hover:bg-neon',
      subtle: 'pro-btn--subtle bg-muted text-ink hover:bg-neon',
      danger: 'pro-btn--danger bg-destructive text-white shadow-soft hover:bg-neon hover:text-ink',
      link: 'pro-btn--link border-transparent bg-transparent text-primary underline-offset-4 hover:underline',
    },
    size: {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4',
      lg: 'h-12 px-6 text-[0.95rem]',
      icon: 'size-10 p-0',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})

export interface ProButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof proButtonVariants> {
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const ProButton = forwardRef<HTMLButtonElement, ProButtonProps>(function ProButton(
  { className, variant, size, loading = false, leftIcon, rightIcon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(proButtonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : leftIcon}
      {children}
      {!loading ? rightIcon : null}
    </button>
  )
})
