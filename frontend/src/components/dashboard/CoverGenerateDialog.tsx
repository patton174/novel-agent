import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import {
  composeCoverImagePrompt,
  fetchCoverPrompt,
  type CoverPromptBundle,
  type CoverPromptStreamField,
} from '@/api/coverPromptApi'
import { EditorIcons } from '@/components/editor/icons'
import { AppModalShell } from '@/components/ui/AppModalShell'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'
import { useTranslation } from 'react-i18next'

export interface CoverGeneratePayload {
  stylePrompt: string
  scenePrompt: string
  imagePrompt: string
}

interface CoverGenerateDialogProps {
  open: boolean
  novelId: string | null
  novelTitle: string
  onOpenChange: (open: boolean) => void
  onGenerate: (payload: CoverGeneratePayload) => void
}

function StreamingField({
  label,
  value,
  onChange,
  rows,
  minHeight,
  placeholder,
  streaming,
  active,
  streamHint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows: number
  minHeight: string
  placeholder: string
  streaming: boolean
  active: boolean
  streamHint?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {streaming && active && streamHint ? (
          <motion.span
            className="text-[11px] font-medium text-primary"
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            {streamHint}
          </motion.span>
        ) : null}
      </div>
      <div className="relative">
        {streaming && active ? (
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-xl"
            animate={{
              boxShadow: [
                '0 0 0 1px rgba(99,102,241,0.35), 0 0 18px rgba(99,102,241,0.12)',
                '0 0 0 1px rgba(139,92,246,0.55), 0 0 28px rgba(139,92,246,0.22)',
                '0 0 0 1px rgba(99,102,241,0.35), 0 0 18px rgba(99,102,241,0.12)',
              ],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : null}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={streaming}
          rows={rows}
          placeholder={placeholder}
          className={cn(
            'relative w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none',
            minHeight,
            'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            streaming && 'cursor-default bg-muted/20',
            streaming && active && 'border-primary/40',
          )}
        />
        {streaming && active ? (
          <motion.span
            className="pointer-events-none absolute bottom-3 right-3 size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.9)]"
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : null}
      </div>
    </div>
  )
}

export function CoverGenerateDialog({
  open,
  novelId,
  novelTitle,
  onOpenChange,
  onGenerate,
}: CoverGenerateDialogProps) {
  const { t } = useTranslation(['dashboard'])
  const [stylePrompt, setStylePrompt] = useState('')
  const [scenePrompt, setScenePrompt] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [activeField, setActiveField] = useState<CoverPromptStreamField | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const applyBundle = useCallback((bundle: CoverPromptBundle) => {
    setStylePrompt(bundle.stylePrompt)
    setScenePrompt(bundle.scenePrompt)
  }, [])

  const runFetch = useCallback(
    async (id: string, opts?: { styleDraft?: string; sceneDraft?: string; mode?: 'generate' | 'optimize' }) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setStreaming(true)
      setActiveField('style')
      setStylePrompt('')
      setScenePrompt('')

      try {
        const bundle = await fetchCoverPrompt({
          novelId: id,
          styleDraft: opts?.styleDraft,
          sceneDraft: opts?.sceneDraft,
          mode: opts?.mode ?? 'generate',
          signal: controller.signal,
          onPhase: (field) => setActiveField(field),
          onDelta: (field, text) => {
            if (field === 'style') {
              setStylePrompt((prev) => (opts?.mode === 'optimize' ? prev : prev) + text)
            } else {
              setScenePrompt((prev) => prev + text)
            }
          },
        })
        if (bundle) {
          applyBundle(bundle)
        }
      } catch {
        if (!controller.signal.aborted) {
          appToast.error(t('dashboard:coverDialog.promptGenFail'))
        }
      } finally {
        if (!controller.signal.aborted) {
          setStreaming(false)
          setActiveField(null)
        }
      }
    },
    [applyBundle, t],
  )

  useEffect(() => {
    if (!open || !novelId) {
      abortRef.current?.abort()
      setStreaming(false)
      setActiveField(null)
      return
    }
    setStylePrompt('')
    setScenePrompt('')
    void runFetch(novelId)
    return () => {
      abortRef.current?.abort()
    }
  }, [open, novelId, runFetch])

  const handleEnhance = () => {
    if (!novelId || streaming) return
    void runFetch(novelId, {
      styleDraft: stylePrompt,
      sceneDraft: scenePrompt,
      mode: 'optimize',
    })
  }

  const handleSubmit = () => {
    const style = stylePrompt.trim()
    const scene = scenePrompt.trim()
    if (!style && !scene) {
      appToast.error(t('dashboard:coverDialog.promptReq'))
      return
    }
    onGenerate({
      stylePrompt: style,
      scenePrompt: scene,
      imagePrompt: composeCoverImagePrompt(style, scene),
    })
    onOpenChange(false)
  }

  const streamHint =
    activeField === 'style'
      ? t('dashboard:coverDialog.streamingStyle')
      : activeField === 'scene'
        ? t('dashboard:coverDialog.streamingScene')
        : t('dashboard:coverDialog.loadingPrompt')

  return (
    <AppModalShell
      open={open}
      onOpenChange={onOpenChange}
      size="form"
      className="gap-0 overflow-hidden p-0"
      bodyClassName="overflow-y-auto p-0"
      header={
        <>
          <div className="relative h-0.5 overflow-hidden bg-muted">
            {streaming ? (
              <motion.div
                className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-primary via-violet-500 to-primary"
                animate={{ x: ['-100%', '320%'] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : (
              <div className="h-full bg-gradient-to-r from-primary/0 via-primary/70 to-violet-500/70" />
            )}
          </div>
          <div className="space-y-2 p-6 pb-0 text-left">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className={cn('size-4', streaming && 'animate-pulse')} />
              </div>
              <DialogTitle className="text-lg">{t('dashboard:coverDialog.title')}</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              {t('dashboard:coverDialog.desc1')}
              <span className="font-medium text-foreground">{novelTitle}</span>
              {t('dashboard:coverDialog.desc2')}
            </DialogDescription>
          </div>
        </>
      }
    >
      <div className="space-y-4 px-6 pb-6">
        <StreamingField
          label={t('dashboard:coverDialog.styleLabel')}
          value={stylePrompt}
          onChange={setStylePrompt}
          rows={3}
          minHeight="min-h-[72px]"
          placeholder={t('dashboard:coverDialog.stylePlaceholder')}
          streaming={streaming}
          active={activeField === 'style'}
          streamHint={streamHint}
        />

        <div className="space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
              disabled={streaming || !novelId}
              onClick={handleEnhance}
            >
              <span className={cn('inline-flex size-3.5 [&_svg]:size-full', streaming && 'animate-spin')}>
                <EditorIcons.Sparkles />
              </span>
              {t('dashboard:coverDialog.aiBtnTitle')}
            </Button>
          </div>
          <StreamingField
            label={t('dashboard:coverDialog.sceneLabel')}
            value={scenePrompt}
            onChange={setScenePrompt}
            rows={6}
            minHeight="min-h-[140px]"
            placeholder={t('dashboard:coverDialog.scenePlaceholder')}
            streaming={streaming}
            active={activeField === 'scene'}
            streamHint={streamHint}
          />
        </div>

        <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-ui-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground/75">{t('dashboard:coverDialog.noticeTitle')}</span>
          {t('dashboard:coverDialog.noticeDesc')}
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            {t('dashboard:coverDialog.cancel')}
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90"
            disabled={streaming || (!stylePrompt.trim() && !scenePrompt.trim())}
            onClick={handleSubmit}
          >
            {t('dashboard:coverDialog.submit')}
          </Button>
        </DialogFooter>
      </div>
    </AppModalShell>
  )
}
