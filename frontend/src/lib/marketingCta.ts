/** 营销站 CTA 样式 token — 全站 primary / secondary 按钮统一（营销区 intentionally 使用 rounded-full pill） */
export const MKT_CTA_PRIMARY =
  'mkt-cta-glow inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary-hover'

export const MKT_CTA_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-full border border-border/80 bg-white/80 px-6 py-3 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white hover:shadow-md'

export const MKT_CTA_PRIMARY_LG =
  'mkt-cta-glow inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 hover:bg-primary-hover'

export const MKT_CTA_TIER =
  'flex h-12 w-full items-center justify-center rounded-full text-base font-semibold transition-all duration-300'

export const MKT_CTA_TIER_HIGHLIGHT =
  `${MKT_CTA_TIER} bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30`

export const MKT_CTA_TIER_OUTLINE =
  `${MKT_CTA_TIER} border border-border bg-surface text-foreground hover:border-primary/40 hover:bg-surface-hover`

/** 认证页全宽按钮（与 AuthField h-11 对齐） */
export const MKT_CTA_AUTH =
  'mkt-cta-glow inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary-hover'

export const MKT_CTA_AUTH_OUTLINE =
  'inline-flex h-11 w-full items-center justify-center rounded-full border border-border text-sm font-medium text-foreground transition hover:bg-muted/50'

/** 深色区 / 表单内联主按钮（与 rounded-xl 输入框同几何） */
export const MKT_CTA_PRIMARY_INLINE =
  'mkt-cta-glow inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50'

/** 小尺寸次要 pill（重试、辅助） */
export const MKT_CTA_PILL_SM =
  'inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-1.5 text-xs transition hover:bg-white/10'
