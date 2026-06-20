import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface ProFooterLink {
  label: string
  to: string
}

export interface ProFooterProps {
  links?: ProFooterLink[]
  copyright?: string
  className?: string
}

export function ProFooter({ links = [], copyright = '© 2026 Novel Studio', className }: ProFooterProps) {
  return (
    <footer className={cn('border-t border-border/60 px-6 py-4', className)}>
      <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <span>{copyright}</span>
        <nav className="flex gap-4">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="transition-colors hover:text-foreground">{l.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
