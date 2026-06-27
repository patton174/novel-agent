import { create } from 'zustand'

const STORAGE_KEY = 'novel-dashboard-sidebar-collapsed'

function loadCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === '1'
}

function persistCollapsed(collapsed: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
}

interface DashboardSidebarState {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (value: boolean) => void
}

export const useDashboardSidebarStore = create<DashboardSidebarState>((set, get) => ({
  collapsed: loadCollapsed(),
  toggle: () => {
    const next = !get().collapsed
    persistCollapsed(next)
    set({ collapsed: next })
  },
  setCollapsed: (collapsed) => {
    persistCollapsed(collapsed)
    set({ collapsed })
  },
}))
