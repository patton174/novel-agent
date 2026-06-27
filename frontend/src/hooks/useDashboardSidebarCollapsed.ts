import { useDashboardSidebarStore } from '@/stores/dashboardSidebarStore'

export function useDashboardSidebarCollapsed() {
  const collapsed = useDashboardSidebarStore((s) => s.collapsed)
  const toggle = useDashboardSidebarStore((s) => s.toggle)
  const setCollapsed = useDashboardSidebarStore((s) => s.setCollapsed)
  return { collapsed, toggle, setCollapsed }
}
