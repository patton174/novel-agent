import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const proButtonVariants = cva('pro-btn inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:shrink-0', {
  variants: {
    variant: {
      primary: 'pro-btn--primary bg-primary text-primary-foreground hover:bg-primary-hover shadow-soft',
      secondary: 'pro-btn--secondary bg-surface border border-border text-foreground hover:bg-muted',
      ghost: 'pro-btn--ghost text-muted-foreground hover:bg-muted hover:text-foreground',
      subtle: 'pro-btn--subtle bg-muted text-foreground hover:bg-muted/70',
      danger: 'pro-btn--danger bg-destructive/10 text-destructive hover:bg-destructive/20',
      link: 'pro-btn--link text-primary underline-offset-4 hover:underline',
    },
    size: {
      sm: 'h-8 px-3 text-[0.8rem]',
      md: 'h-9 px-4',
      lg: 'h-10 px-5 text-[0.95rem]',
      icon: 'size-9 p-0',
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
