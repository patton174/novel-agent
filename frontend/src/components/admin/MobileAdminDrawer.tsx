import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProIconMenu } from '@/components/pro/icons/proIcons'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { MOBILE_DRAWER_SHEET_CLASS } from '@/lib/drawerLayout'

export function MobileAdminDrawer() {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t('a11y.openAdminMenu')}
        >
          <ProIconMenu size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" showCloseButton={false} className={`gap-0 p-0 ${MOBILE_DRAWER_SHEET_CLASS}`}>
        <SheetTitle className="sr-only">{t('a11y.adminNav')}</SheetTitle>
        <AdminSidebar embedded onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
