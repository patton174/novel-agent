import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { EditorSidebar, type EditorSidebarProps } from '@/components/editor/EditorSidebar'

export function EditorMobileNav(props: EditorSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="hidden shrink-0 items-center border-b border-border px-2.5 py-1.5 max-md:flex">
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="打开编辑器侧栏"
            className="size-9"
          >
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
      </div>
      <SheetContent side="left" className="w-[min(100vw-1rem,284px)] gap-0 p-0">
        <SheetTitle className="sr-only">编辑器导航</SheetTitle>
        <div className="h-full overflow-hidden" onClick={() => setOpen(false)}>
          <EditorSidebar {...props} embedded />
        </div>
      </SheetContent>
    </Sheet>
  )
}
