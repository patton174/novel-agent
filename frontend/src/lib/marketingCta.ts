import { cva } from 'class-variance-authority'

export const marketingCtaVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all',
  {
    variants: {
      variant: {
        primary: 'mkt-cta-glow bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'border border-border/80 bg-surface/80 text-foreground shadow-sm backdrop-blur-sm hover:border-primary/25 hover:bg-surface hover:shadow-md',
        tierHighlight: 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30',
        tierOutline: 'border border-border bg-surface text-foreground hover:border-primary/40 hover:bg-surface-hover',
        auth: 'mkt-cta-glow bg-primary text-primary-foreground hover:bg-primary-hover font-medium',
        authOutline: 'border border-border text-foreground hover:bg-muted/50 font-medium',
        inline: 'mkt-cta-glow bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50',
        onDark: 'border border-white/15 text-white hover:bg-white/10',
        footerPrimary: 'bg-surface text-primary shadow-lg shadow-black/20 hover:bg-surface-hover hover:shadow-xl',
        footerSecondary: 'border border-white/35 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
      },
      size: {
        default: 'px-6 py-3 text-sm transition-transform hover:-translate-y-0.5',
        lg: 'px-8 py-3.5 text-base transition-transform hover:-translate-y-0.5',
        tier: 'h-12 w-full text-base duration-300',
        auth: 'h-11 w-full text-sm',
        inline: 'px-5 py-3 text-sm',
        sm: 'px-4 py-1.5 text-xs',
        footer: 'px-7 py-3.5 text-sm transition-transform hover:-translate-y-0.5',
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default'
    }
  }
)

export const MKT_CTA_PRIMARY = marketingCtaVariants({ variant: 'primary', size: 'default' })
export const MKT_CTA_SECONDARY = marketingCtaVariants({ variant: 'secondary', size: 'default' })
export const MKT_CTA_PRIMARY_LG = marketingCtaVariants({ variant: 'primary', size: 'lg' })
export const MKT_CTA_TIER = marketingCtaVariants({ variant: 'tierOutline', size: 'tier' })
export const MKT_CTA_TIER_HIGHLIGHT = marketingCtaVariants({ variant: 'tierHighlight', size: 'tier' })
export const MKT_CTA_TIER_OUTLINE = marketingCtaVariants({ variant: 'tierOutline', size: 'tier' })
export const MKT_CTA_AUTH = marketingCtaVariants({ variant: 'auth', size: 'auth' })
export const MKT_CTA_AUTH_OUTLINE = marketingCtaVariants({ variant: 'authOutline', size: 'auth' })
export const MKT_CTA_PRIMARY_INLINE = marketingCtaVariants({ variant: 'inline', size: 'inline' })
export const MKT_CTA_ON_DARK_SM = marketingCtaVariants({ variant: 'onDark', size: 'sm' })
export const MKT_CTA_FOOTER_PRIMARY = marketingCtaVariants({ variant: 'footerPrimary', size: 'footer' })
export const MKT_CTA_FOOTER_SECONDARY = marketingCtaVariants({ variant: 'footerSecondary', size: 'footer' })
