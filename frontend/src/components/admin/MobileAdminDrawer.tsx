import { useState } from 'react'
import { ProIconMenu } from '@/components/pro/icons/proIcons'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { MOBILE_DRAWER_SHEET_CLASS } from '@/lib/drawerLayout'

export function MobileAdminDrawer() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="打开管理菜单"
        >
          <ProIconMenu size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" showCloseButton={false} className={`gap-0 p-0 ${MOBILE_DRAWER_SHEET_CLASS}`}>
        <SheetTitle className="sr-only">管理后台导航</SheetTitle>
        <AdminSidebar embedded onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
