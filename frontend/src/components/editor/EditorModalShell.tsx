/**
 * @deprecated Prefer `AppModalShell` — legacy styled overlay primitives kept for gradual migration.
 */
export {
  EditorModalOverlay,
  EditorModalPanel,
  EditorModalHeader,
  EditorModalBody,
  EditorModalPanelInset,
  useEditorModalEscape,
  type EditorModalSize,
} from './EditorModalShell.legacy'

export { AppModalShell, type AppModalSize, type AppModalShellProps } from '@/components/ui/AppModalShell'
