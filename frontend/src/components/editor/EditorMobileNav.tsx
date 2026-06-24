import { PixelIcons } from '@/components/icons/PixelIcons'
import { useTranslation } from 'react-i18next'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { EditorMobileSidebar } from '@/components/editor/EditorMobileSidebar'
import { EditorMobileHeaderActions } from '@/components/editor/EditorMobileHeaderActions'
import type { EditorCenterTab } from '@/components/editor/EditorCenterTabs.types'
import type { EditorSidebarCommonProps } from '@/components/editor/editorSidebarTypes'
import { MOBILE_DRAWER_SHEET_CLASS } from '@/lib/drawerLayout'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'
import { cn } from '@/lib/utils'

export interface EditorMobileNavProps extends EditorSidebarCommonProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTab: EditorCenterTab
  headerTitle: string
  headerDescription?: string
}

export function EditorMobileNav({
  open,
  onOpenChange,
  activeTab,
  headerTitle,
  headerDescription,
  ...sidebarProps
}: EditorMobileNavProps) {
  const { t } = useTranslation(['editor'])
  const sidebarTriggerLabel =
    activeTab === 'story'
      ? t('editor:mobileNav.openChapters')
      : activeTab === 'mine'
        ? t('editor:mobileNav.openProfile')
        : t('editor:mobileNav.openSessions')

  return (
    <>
      <header className="z-10 flex h-16 shrink-0 items-center gap-3 border-b border-border/80 bg-surface/95 px-4 shadow-sm backdrop-blur-sm max-md:flex md:hidden">
        <button
          type="button"
          aria-label={sidebarTriggerLabel}
          title={sidebarTriggerLabel}
          className={cn(editorPixelIconButtonClass(), 'inline-flex size-8 shrink-0 items-center justify-center')}
          onClick={() => onOpenChange(true)}
        >
          <PixelIcons.Menu />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-none text-foreground">{headerTitle}</h1>
          {headerDescription ? (
            <p className="mt-1.5 truncate text-sm text-muted-foreground">{headerDescription}</p>
          ) : null}
        </div>
        <EditorMobileHeaderActions />
      </header>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className={cn('gap-0 border-r-0 bg-background p-0', MOBILE_DRAWER_SHEET_CLASS)}
        >
          <SheetTitle className="sr-only">{t('editor:mobileNav.title')}</SheetTitle>
          <EditorMobileSidebar {...sidebarProps} onCloseDrawer={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
