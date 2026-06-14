/** 全站移动断点上限（px）。Tailwind `max-md:` 对应 max-width: 767px，与此一致。 */
export const APP_MOBILE_MAX_PX = 767

export const APP_MOBILE_MEDIA = `(max-width: ${APP_MOBILE_MAX_PX}px)`

/** 桌面起始于 768px，与 Tailwind `md:` 一致 */
export const APP_DESKTOP_MEDIA = `(min-width: ${APP_MOBILE_MAX_PX + 1}px)`

export function matchesAppMobile(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.matchMedia(APP_MOBILE_MEDIA).matches
}
