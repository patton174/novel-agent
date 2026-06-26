import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'novel-admin-sidebar-collapsed'

export function useAdminSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const toggle = useCallback(() => setCollapsedState((v) => !v), [])
  const setCollapsed = useCallback((value: boolean) => setCollapsedState(value), [])

  return { collapsed, toggle, setCollapsed }
}
