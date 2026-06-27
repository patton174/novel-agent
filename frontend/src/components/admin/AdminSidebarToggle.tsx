import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAdminSidebarCollapsed } from '@/hooks/useAdminSidebarCollapsed'
import { cn } from '@/lib/utils'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'

export function AdminSidebarToggle({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  const { collapsed, toggle } = useAdminSidebarCollapsed()

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(editorPixelIconButtonClass(), 'shrink-0 text-foreground', className)}
      aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
      title={collapsed ? t('sidebar.expandShort') : t('sidebar.collapseShort')}
    >
      {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
    </button>
  )
}
