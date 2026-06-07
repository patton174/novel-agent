import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { closeConfirmDialog, useConfirmDialogStore } from '@/stores/confirmDialogStore'

export function ConfirmDialogHost() {
  const { open, title, description, confirmLabel, cancelLabel, danger } = useConfirmDialogStore()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeConfirmDialog(false)
      }}
    >
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
        <DialogHeader className="space-y-2 px-6 pt-6 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter className="gap-2 px-6 pb-6 pt-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => closeConfirmDialog(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? 'destructive' : 'default'}
            onClick={() => closeConfirmDialog(true)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
