import { useEffect, useState } from 'react'
import { startSessionBootstrap } from './sessionBootstrap'

/** 刷新后先完成 session 恢复（token / refresh），再让路由守卫判断登录态 */
export function useAuthReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    void startSessionBootstrap().finally(() => {
      if (!cancelled) {
        setReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])
  return ready
}
