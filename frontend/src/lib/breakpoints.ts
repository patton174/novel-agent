/** 与 Editor Modal / Dialog 对齐的移动断点（767px，非 Tailwind md 768） */
export const APP_MOBILE_MAX_PX = 767

export const APP_MOBILE_MEDIA = `(max-width: ${APP_MOBILE_MAX_PX}px)`

/** Tailwind `max-md:` 对齐此断点时在 vite 中需自定义；CSS 内直接用 APP_MOBILE_MEDIA */
export const APP_DESKTOP_MEDIA = `(min-width: ${APP_MOBILE_MAX_PX + 1}px)`
