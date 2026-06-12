import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { suggestNovelCoverPrompt } from '@/api/dashboardApi'
import { EditorIcons } from '@/components/editor/icons'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'

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
      appToast.error(err instanceof Error ? err.message : '提示词生成失败')
    } finally {
      setEnhancing(false)
    }
  }

  const handleSubmit = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      appToast.error('请输入封面提示词')
      return
    }
    setSubmitting(true)
    try {
      await onConfirm(trimmed)
      onOpenChange(false)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '封面生成失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="h-0.5 bg-gradient-to-r from-primary/0 via-primary/70 to-violet-500/70" />
        <div className="space-y-5 p-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
              <DialogTitle className="text-lg">AI 生成封面</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              为「<span className="font-medium text-foreground">{novelTitle}</span>」描述画面氛围与构图，或使用右侧按钮让 AI 补全提示词。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">封面提示词</label>
            <div className="flex items-start gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loadingPrompt || submitting}
                rows={5}
                placeholder={loadingPrompt ? '正在加载建议提示词…' : '例如：古风仙侠、云雾山峦、主角剪影、电影海报构图…'}
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
                aria-label="AI 生成或优化提示词"
                title="AI 生成或优化提示词"
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

          <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground/75">AI 生成说明：</span>
            封面由 AI 图像模型根据你的提示词实时生成，仅供创作参考；请确认不侵犯他人版权或肖像权，生成结果可能因模型随机性略有差异。
          </p>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-border text-foreground"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              取消
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
                  生成中…
                </>
              ) : (
                '开始生成'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
