import { useAdminSidebarStore } from '@/stores/adminSidebarStore'

export function useAdminSidebarCollapsed() {
  const collapsed = useAdminSidebarStore((s) => s.collapsed)
  const toggle = useAdminSidebarStore((s) => s.toggle)
  const setCollapsed = useAdminSidebarStore((s) => s.setCollapsed)
  return { collapsed, toggle, setCollapsed }
}
