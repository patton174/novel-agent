import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isLoggedIn } from '../utils/auth'

const LAST_VISITED_KEY = 'novel_agent_last_visited'

/**
 * 跟踪用户的访问路径，并在初次加载时尝试恢复上次的页面
 */
export function useJourneyTracker() {
  const location = useLocation()
  const navigate = useNavigate()

  // 记录当前路径
  useEffect(() => {
    // 排除登录、注册等不需要恢复的页面
    if (!['/login', '/register'].includes(location.pathname)) {
      localStorage.setItem(LAST_VISITED_KEY, location.pathname + location.search)
    }
  }, [location])

  // 初始加载时恢复路径
  useEffect(() => {
    const isInitialLoad = !sessionStorage.getItem('journey_initialized')
    if (isInitialLoad) {
      sessionStorage.setItem('journey_initialized', 'true')
      
      const lastVisited = localStorage.getItem(LAST_VISITED_KEY)
      // 如果有记录，且不是当前页，且不是根路径（根路径通常是入口，不强制跳走，除非用户已登录且上次在 dashboard）
      if (lastVisited && lastVisited !== location.pathname) {
        // 如果上次在需要授权的页面，但现在没登录，就不跳
        const requiresAuth = lastVisited.startsWith('/dashboard') || lastVisited.startsWith('/editor')
        if (requiresAuth && !isLoggedIn()) {
          return
        }
        
        // 延迟一点跳转，避免闪烁
        setTimeout(() => {
          navigate(lastVisited, { replace: true })
        }, 100)
      }
    }
  }, [navigate, location])
}

/**
 * 表单草稿保存 Hook
 */
export function useFormDraft<T>(key: string, initialValue: T): [T, (val: T) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    const draft = localStorage.getItem(`draft_${key}`)
    if (draft) {
      try {
        return JSON.parse(draft)
      } catch {
        return initialValue
      }
    }
    return initialValue
  })

  const updateValue = (newVal: T) => {
    setValue(newVal)
    localStorage.setItem(`draft_${key}`, JSON.stringify(newVal))
  }

  const clearDraft = () => {
    localStorage.removeItem(`draft_${key}`)
  }

  return [value, updateValue, clearDraft]
}
