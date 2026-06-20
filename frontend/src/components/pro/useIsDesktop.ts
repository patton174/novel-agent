import { useAppMobile } from '@/hooks/useMediaQuery'

/** 是否桌面端（≥768px）。语义化封装，供页面分发器使用。 */
export function useIsDesktop(): boolean {
  return !useAppMobile()
}
