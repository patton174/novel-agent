import { cn } from '@/lib/utils'
import { EDITOR_PIXEL_MODAL_HEADER, EDITOR_PIXEL_MODAL_PANEL } from '@/lib/editorPixelClasses'

export type EditorModalSize = 'confirm' | 'form' | 'settings' | 'todo' | 'detail' | 'memory'

export const EDITOR_MODAL_OVERLAY = cn(
  'fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-5',
  'max-md:items-stretch max-md:p-0',
)

export const EDITOR_MODAL_PANEL = EDITOR_PIXEL_MODAL_PANEL

export const EDITOR_MODAL_SIZE: Record<EditorModalSize, string> = {
  confirm: 'w-full max-w-[420px] max-h-[90vh]',
  form: 'w-full max-w-[480px] max-h-[640px]',
  settings: 'w-full max-w-[440px] max-h-[520px]',
  todo: 'w-full max-w-[520px] max-h-[640px]',
  detail: 'w-full max-w-[720px] max-h-[760px]',
  memory: cn(
    'w-full max-w-[920px] min-w-[min(680px,100%)]',
    'h-[min(78vh,700px)] min-h-[min(520px,100%)] max-h-[min(760px,90vh)]',
    'max-md:min-w-0 max-md:h-full max-md:max-h-none max-md:min-h-0',
  ),
}

export const EDITOR_MODAL_HEADER = EDITOR_PIXEL_MODAL_HEADER

export const EDITOR_MODAL_BODY = cn(
  'min-h-0 flex-1 overflow-y-auto',
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border',
)

export const EDITOR_MODAL_INSET = cn(
  'overflow-y-auto p-6 px-7',
  'max-md:px-4 max-md:pb-[max(1.5rem,env(safe-area-inset-bottom))] max-md:pt-5',
)
