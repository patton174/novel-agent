import { useState } from 'react'
import { Menu } from 'lucide-react'
import { AppSidebar } from '@/components/dashboard/AppSidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { MOBILE_DRAWER_SHEET_CLASS } from '@/lib/drawerLayout'

export function MobileSidebarDrawer() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="打开导航菜单"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className={`gap-0 p-0 ${MOBILE_DRAWER_SHEET_CLASS}`}>
        <SheetTitle className="sr-only">导航菜单</SheetTitle>
        <AppSidebar embedded onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
