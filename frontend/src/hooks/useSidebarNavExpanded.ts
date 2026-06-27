import { useCallback, useEffect, useRef, useState } from 'react'

function loadExpanded(storageKey: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

export type SidebarGroupExpandMode = 'accordion' | 'independent'

/** 侧栏分组展开：管理台 accordion（仅一组展开）；仪表盘 independent（各组独立折叠） */
export function useSidebarNavExpanded(
  storageKey: string,
  groupIds: string[],
  activeGroupId: string | null,
  mode: SidebarGroupExpandMode = 'accordion',
) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => loadExpanded(storageKey))
  const groupIdsRef = useRef(groupIds)
  groupIdsRef.current = groupIds
  const groupIdsKey = groupIds.join('\0')

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(expanded))
  }, [expanded, storageKey])

  useEffect(() => {
    if (!activeGroupId) return
    if (mode === 'independent') {
      setExpanded((prev) => {
        if (prev[activeGroupId] !== false) return prev
        return { ...prev, [activeGroupId]: true }
      })
      return
    }
    const ids = groupIdsRef.current
    setExpanded((prev) => {
      const alreadyOnlyActive = ids.every((id) =>
        id === activeGroupId ? prev[id] !== false : prev[id] === false,
      )
      if (alreadyOnlyActive) return prev
      const next: Record<string, boolean> = {}
      for (const id of ids) {
        next[id] = id === activeGroupId
      }
      return next
    })
  }, [activeGroupId, groupIdsKey, mode])

  const isOpen = useCallback((id: string) => expanded[id] !== false, [expanded])

  const toggle = useCallback(
    (id: string) => {
      setExpanded((prev) => {
        const open = prev[id] !== false
        if (mode === 'independent') {
          return { ...prev, [id]: !open }
        }
        if (open) {
          return { ...prev, [id]: false }
        }
        const next: Record<string, boolean> = {}
        for (const gid of groupIdsRef.current) {
          next[gid] = gid === id
        }
        return next
      })
    },
    [mode],
  )

  return { isOpen, toggle }
}
