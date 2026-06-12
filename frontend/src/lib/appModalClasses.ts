/** shadcn DialogContent — mobile full-screen sheet (767px, aligned with editor) */
export const APP_MODAL_MOBILE_FULL =
  'max-md:inset-0 max-md:top-0 max-md:left-0 max-md:h-[100dvh] max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none'

/** Form / admin dialogs: scroll body + stacked footer on mobile */
export const APP_MODAL_FORM =
  `${APP_MODAL_MOBILE_FULL} max-md:overflow-y-auto max-md:p-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]`

/** Large reader / detail dialogs */
export const APP_MODAL_READER =
  `${APP_MODAL_MOBILE_FULL} max-md:flex max-md:flex-col max-md:gap-0 max-md:overflow-hidden max-md:p-0`
