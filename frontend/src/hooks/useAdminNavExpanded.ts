import { useSidebarNavExpanded } from './useSidebarNavExpanded'

const STORAGE_KEY = 'novel-admin-nav-expanded'

/** 管理后台侧栏分组手风琴 */
export function useAdminNavExpanded(groupIds: string[], activeGroupId: string | null) {
  return useSidebarNavExpanded(STORAGE_KEY, groupIds, activeGroupId)
}
