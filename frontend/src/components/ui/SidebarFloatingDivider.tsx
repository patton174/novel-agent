import { cn } from '@/lib/utils'

/** Horizontal inset shared by sidebar footer cards and floating dividers. */
export const SIDEBAR_FOOTER_INSET = 'px-2.5'

/** Vertical gap between sidebar footer groups. */
export const SIDEBAR_FOOTER_GROUP_GAP = 'gap-3'

export interface SidebarFloatingDividerProps {
  className?: string
}

/** Inset horizontal rule — same width as insight cards, does not touch sidebar edges. */
export function SidebarFloatingDivider({ className }: SidebarFloatingDividerProps) {
  return (
    <div
      role="separator"
      aria-hidden
      className={cn('w-full shrink-0', className)}
    >
      <div className="h-px w-full rounded-full bg-border/55" />
    </div>
  )
}
