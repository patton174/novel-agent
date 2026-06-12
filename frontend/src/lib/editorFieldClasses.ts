import { cn } from '@/lib/utils'
import { authFieldClass } from '@/components/auth/authFieldClass'

/** 编辑器 Modal 内输入框 — 与 Auth / Admin 对齐 */
export const editorFieldClass = authFieldClass

export const editorTextareaClass = cn(
  editorFieldClass,
  'min-h-[5rem] resize-y py-2.5 leading-relaxed',
)
