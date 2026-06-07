import { useState } from 'react'
import { Menu } from 'lucide-react'
import styled from 'styled-components'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { EditorSidebar, type EditorSidebarProps } from '@/components/editor/EditorSidebar'

const MobileBar = styled.div`
  display: none;
  align-items: center;
  padding: 0.45rem 0.65rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;

  @media (max-width: 767px) {
    display: flex;
  }
`

const MenuButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: inherit;
  cursor: pointer;
`

export function EditorMobileNav(props: EditorSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <MobileBar>
        <SheetTrigger asChild>
          <MenuButton type="button" aria-label="打开编辑器侧栏">
            <Menu className="size-4" />
          </MenuButton>
        </SheetTrigger>
      </MobileBar>
      <SheetContent side="left" className="w-[min(100vw-1rem,284px)] gap-0 p-0">
        <SheetTitle className="sr-only">编辑器导航</SheetTitle>
        <div className="h-full overflow-hidden" onClick={() => setOpen(false)}>
          <EditorSidebar {...props} embedded />
        </div>
      </SheetContent>
    </Sheet>
  )
}
