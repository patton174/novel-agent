import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { suggestNovelCoverPrompt } from '@/api/dashboardApi'
import { EditorIcons } from '@/components/editor/icons'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'
import { useTranslation } from 'react-i18next'

interface CoverGenerateDialogProps {
  open: boolean
  novelId: string | null
  novelTitle: string
  onOpenChange: (open: boolean) => void
  onConfirm: (prompt: string) => Promise<void>
}

export function CoverGenerateDialog({
  open,
  novelId,
  novelTitle,
  onOpenChange,
  onConfirm,
}: CoverGenerateDialogProps) {
  const { t } = useTranslation(['dashboard'])
  const [prompt, setPrompt] = useState('')
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadInitialPrompt = useCallback(async (id: string) => {
    setLoadingPrompt(true)
    try {
      const suggested = await suggestNovelCoverPrompt(id)
      setPrompt(suggested ?? '')
    } catch {
      setPrompt('')
    } finally {
      setLoadingPrompt(false)
    }
  }, [])

  useEffect(() => {
    if (!open || !novelId) {
      return
    }
    void loadInitialPrompt(novelId)
  }, [open, novelId, loadInitialPrompt])

  const handleEnhance = async () => {
    if (!novelId || enhancing) {
      return
    }
    setEnhancing(true)
    try {
      const suggested = await suggestNovelCoverPrompt(novelId, prompt)
      if (suggested) {
        setPrompt(suggested)
      }
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('dashboard:coverDialog.promptGenFail'))
    } finally {
      setEnhancing(false)
    }
  }

  const handleSubmit = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      appToast.error(t('dashboard:coverDialog.promptReq'))
      return
    }
    setSubmitting(true)
    try {
      await onConfirm(trimmed)
      onOpenChange(false)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('dashboard:coverDialog.coverGenFail'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppModalShell
      open={open}
      onOpenChange={onOpenChange}
      size="form"
      className="gap-0 overflow-hidden p-0"
      bodyClassName="overflow-y-auto p-0"
      header={
        <>
          <div className="h-0.5 bg-gradient-to-r from-primary/0 via-primary/70 to-violet-500/70" />
          <div className="space-y-2 p-6 pb-0 text-left">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
              <DialogTitle className="text-lg">{t('dashboard:coverDialog.title')}</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              {t('dashboard:coverDialog.desc1')}<span className="font-medium text-foreground">{novelTitle}</span>{t('dashboard:coverDialog.desc2')}
            </DialogDescription>
          </div>
        </>
      }
    >
      <div className="space-y-5 px-6 pb-6">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{t('dashboard:coverDialog.promptLabel')}</label>
          <div className="flex items-start gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loadingPrompt || submitting}
              rows={5}
              placeholder={loadingPrompt ? t('dashboard:coverDialog.loadingPrompt') : t('dashboard:coverDialog.placeholder')}
              className={cn(
                'min-h-[120px] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none',
                'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-xl border-border text-foreground hover:bg-primary/10 hover:text-primary"
              disabled={loadingPrompt || enhancing || submitting || !novelId}
              onClick={() => void handleEnhance()}
              aria-label={t('dashboard:coverDialog.aiBtnTitle')}
              title={t('dashboard:coverDialog.aiBtnTitle')}
            >
              {enhancing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <span className="inline-flex size-4 shrink-0 [&_svg]:size-full">
                  <EditorIcons.Sparkles />
                </span>
              )}
            </Button>
          </div>
        </div>

        <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-ui-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground/75">{t('dashboard:coverDialog.noticeTitle')}</span>
          {t('dashboard:coverDialog.noticeDesc')}
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-border text-foreground"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            {t('dashboard:coverDialog.cancel')}
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={loadingPrompt || submitting || !prompt.trim()}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('dashboard:coverDialog.generating')}
              </>
            ) : (
              t('dashboard:coverDialog.submit')
            )}
          </Button>
        </DialogFooter>
      </div>
    </AppModalShell>
  )
}
