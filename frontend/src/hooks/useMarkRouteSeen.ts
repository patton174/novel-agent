import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { markRouteSeen } from '@/utils/seenRoutes'

/** Mark current pathname as visited so layout shells use the light InstantShell on revisit. */
export function useMarkRouteSeen(): void {
  const { pathname } = useLocation()
  useEffect(() => {
    markRouteSeen(pathname)
  }, [pathname])
}
