import { cva } from 'class-variance-authority'

export const marketingCtaVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-none border-2 border-foreground font-mono font-bold uppercase tracking-wider shadow-soft transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-neon hover:text-ink',
        secondary: 'bg-surface text-foreground hover:bg-neon',
        tierHighlight: 'bg-primary text-white hover:bg-neon hover:text-ink',
        tierOutline: 'bg-surface text-foreground hover:bg-neon',
        auth: 'bg-primary text-white hover:bg-neon hover:text-ink',
        authOutline: 'bg-surface text-foreground hover:bg-neon',
        inline: 'bg-primary text-white hover:bg-neon hover:text-ink disabled:opacity-50',
        onDark: 'bg-surface text-foreground hover:bg-neon',
        footerPrimary: 'bg-surface text-foreground hover:bg-neon',
        footerSecondary: 'bg-primary text-white hover:bg-neon hover:text-ink'
      },
      size: {
        default: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base',
        tier: 'h-12 w-full text-base',
        auth: 'h-12 w-full text-sm',
        inline: 'px-5 py-3 text-sm',
        sm: 'px-4 py-1.5 text-xs',
        footer: 'px-7 py-3.5 text-sm',
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
