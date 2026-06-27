import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { IconStroke, type ProIconType } from './IconStroke'
import { cn } from '@/lib/utils'
import { useSidebarNavExpanded, type SidebarGroupExpandMode } from '@/hooks/useSidebarNavExpanded'

export interface ProSidebarItem {
  label: string
  to: string
  icon: ProIconType
  end?: boolean
}

export interface ProSidebarGroup {
  id?: string
  title?: string
  icon?: ProIconType
  hideTitle?: boolean
  items: ProSidebarItem[]
}

export interface ProSidebarProps {
  groups: ProSidebarGroup[]
  embedded?: boolean
  collapsed?: boolean
  onNavigate?: () => void
  className?: string
  header?: ReactNode
  footer?: ReactNode
  collapsibleGroups?: boolean
  /** accordion=管理台仅一组展开；independent=仪表盘各模块独立折叠 */
  groupExpandMode?: SidebarGroupExpandMode
  /** 侧栏分组手风琴 localStorage key */
  navExpandedStorageKey?: string
}

function groupHasActiveItem(items: ProSidebarItem[], pathname: string): boolean {
  return items.some((item) => {
    if (item.end) return pathname === item.to
    return pathname === item.to || pathname.startsWith(`${item.to}/`)
  })
}

/** 父级分组：有子项命中时弱高亮，不用 neon 块 */
function sidebarParentClass(hasActiveChild: boolean, narrow: boolean) {
  return cn(
    'flex w-full items-center border-2 border-transparent font-mono text-sm font-bold uppercase tracking-wide transition-[background-color,border-color,color] duration-200 ease-out',
    narrow ? 'justify-center px-0 py-2.5' : 'gap-2.5 py-2 pl-2.5 pr-3',
    hasActiveChild
      ? 'bg-muted/60 text-primary'
      : 'text-ink/70 hover:bg-muted hover:text-ink',
  )
}

/** 叶子菜单：仅当前路由 neon 高亮 */
function sidebarNavClass(isActive: boolean, narrow: boolean, nested: false | 'sm' | 'md' = false) {
  return cn(
    'flex w-full items-center border-2 border-transparent font-mono text-sm font-bold uppercase tracking-wide transition-[background-color,border-color,color] duration-200 ease-out',
    narrow
      ? 'justify-center px-0 py-2.5'
      : cn(
          'gap-2.5 py-2 pr-3',
          nested === 'md' ? 'pl-8' : nested === 'sm' ? 'pl-4' : 'pl-2.5',
        ),
    isActive ? 'border-black bg-neon text-ink' : 'text-ink/70 hover:bg-muted hover:text-ink',
  )
}

function SidebarNavItem({
  item,
  narrow,
  nested = false,
  onNavigate,
}: {
  item: ProSidebarItem
  narrow: boolean
  nested?: false | 'sm' | 'md'
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={narrow ? item.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) => sidebarNavClass(isActive, narrow, nested && !narrow ? nested : false)}
    >
      {({ isActive }) => (
        <>
          <IconStroke icon={item.icon} active={isActive} size={20} />
          {!narrow ? (
            <span className="min-w-0 flex-1 truncate transition-opacity duration-300">{item.label}</span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

function CollapsibleSidebarGroup({
  group,
  pathname,
  narrow,
  collapsible,
  onNavigate,
  isOpen,
  onToggle,
}: {
  group: ProSidebarGroup
  pathname: string
  narrow: boolean
  collapsible: boolean
  onNavigate?: () => void
  isOpen: boolean
  onToggle: () => void
}) {
  const hasActiveChild = groupHasActiveItem(group.items, pathname)
  const showCollapsible = collapsible && !!group.title && !group.hideTitle
  const groupIcon = group.icon ?? group.items[0]?.icon

  if (group.hideTitle) {
    return (
      <div className="flex flex-col gap-0.5">
        {group.items.map((item) => (
          <SidebarNavItem key={item.to} item={item} narrow={narrow} onNavigate={onNavigate} />
        ))}
      </div>
    )
  }

  if (showCollapsible) {
    return (
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          title={narrow ? group.title : undefined}
          className={sidebarParentClass(hasActiveChild, narrow)}
        >
          <span className="flex size-5 shrink-0 items-center justify-center">
            {groupIcon ? (
              <IconStroke icon={groupIcon} active={hasActiveChild} size={20} />
            ) : (
              <ChevronRight
                className={cn(
                  'size-4 transition-transform duration-300 ease-out',
                  isOpen && 'rotate-90',
                )}
                aria-hidden
              />
            )}
          </span>
          {!narrow ? (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{group.title}</span>
              <ChevronRight
                className={cn(
                  'size-4 shrink-0 transition-transform duration-300 ease-out',
                  isOpen && 'rotate-90',
                )}
                aria-hidden
              />
            </>
          ) : null}
        </button>
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                'flex flex-col gap-0.5',
                !narrow && 'ml-2 border-l-2 border-black/15 pl-1',
                !isOpen && 'pointer-events-none',
              )}
            >
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.to}
                  item={item}
                  narrow={narrow}
                  nested="md"
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (group.title && !narrow) {
    return (
      <div className="flex flex-col gap-0.5 pt-1.5 first:pt-0">
        <p className="px-2.5 pb-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75">
          {group.title}
        </p>
        <div className="flex flex-col gap-0.5">
          {group.items.map((item) => (
            <SidebarNavItem key={item.to} item={item} narrow={narrow} nested="sm" onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {group.items.map((item) => (
        <SidebarNavItem key={item.to} item={item} narrow={narrow} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

export function ProSidebar({
  groups,
  embedded = false,
  collapsed = false,
  onNavigate,
  className,
  header,
  footer,
  collapsibleGroups = false,
  groupExpandMode = 'accordion',
  navExpandedStorageKey,
}: ProSidebarProps) {
  const { pathname } = useLocation()
  const narrow = collapsed && !embedded
  const groupIds = groups.map((g, gi) => g.id ?? g.title ?? String(gi))
  const activeGroupId =
    groups
      .map((g, gi) => ({ id: groupIds[gi], items: g.items }))
      .find(({ items }) => groupHasActiveItem(items, pathname))?.id ?? null
  const { isOpen, toggle } = useSidebarNavExpanded(
    navExpandedStorageKey ?? 'novel-admin-nav-expanded',
    groupIds,
    activeGroupId,
    groupExpandMode,
  )

  return (
    <aside
      className={cn(
        'flex h-full flex-col overflow-hidden bg-white text-ink transition-[width] duration-300 ease-in-out',
        embedded ? 'w-full' : cn('shrink-0 border-r-2 border-black', narrow ? 'w-[4.25rem]' : 'w-56'),
        className,
      )}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <nav
        className={cn(
          'flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2',
          collapsibleGroups ? 'gap-1' : 'gap-0.5',
          narrow && 'px-1.5',
        )}
      >
        {groups.map((group, gi) => {
          const groupId = groupIds[gi]
          return (
            <CollapsibleSidebarGroup
              key={groupId}
              group={group}
              pathname={pathname}
              narrow={narrow}
              collapsible={collapsibleGroups}
              onNavigate={onNavigate}
              isOpen={isOpen(groupId)}
              onToggle={() => toggle(groupId)}
            />
          )
        })}
      </nav>
      {footer ? (
        <div className={cn('shrink-0 border-t-2 border-black p-2', narrow && 'px-1.5')}>{footer}</div>
      ) : null}
    </aside>
  )
}
