import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { APP_MODAL_FORM } from '@/lib/appModalClasses'
import { cn } from '@/lib/utils'
import { closeAppDialog, useAppDialogStore } from '@/stores/confirmDialogStore'

export function ConfirmDialogHost() {
  const {
    open,
    kind,
    title,
    description,
    confirmLabel,
    cancelLabel,
    danger,
    defaultValue,
    placeholder,
  } = useAppDialogStore()

  const [inputValue, setInputValue] = useState(defaultValue ?? '')

  useEffect(() => {
    if (open && kind === 'prompt') {
      setInputValue(defaultValue ?? '')
    }
  }, [open, kind, defaultValue])

  const handleConfirm = () => {
    if (kind === 'prompt') {
      const trimmed = inputValue.trim()
      if (!trimmed) return
      closeAppDialog(trimmed)
      return
    }
    closeAppDialog(true)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeAppDialog(kind === 'prompt' ? null : false)
      }}
    >
      <DialogContent className={cn('max-w-md gap-0 p-0 sm:max-w-md', APP_MODAL_FORM)}>
        <DialogHeader className="space-y-2 px-6 pt-6 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {kind === 'prompt' ? (
          <form
            className="px-6 pt-2"
            onSubmit={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            <Input
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              aria-label={title}
            />
          </form>
        ) : null}

        <DialogFooter className="gap-2 px-6 pb-6 pt-4 sm:justify-end">
          {kind !== 'alert' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => closeAppDialog(kind === 'prompt' ? null : false)}
            >
              {cancelLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={danger ? 'destructive' : 'default'}
            disabled={kind === 'prompt' && !inputValue.trim()}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
