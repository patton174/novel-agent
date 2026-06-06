import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>生成封面</DialogTitle>
          <DialogDescription>
            为「{novelTitle}」自定义封面提示词，或使用 AI 补全/优化当前描述。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loadingPrompt || submitting}
              rows={6}
              placeholder={loadingPrompt ? '正在加载建议提示词…' : '描述封面画面、氛围、构图…'}
              className={cn(
                'min-h-[140px] flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none',
                'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 border-border text-foreground hover:bg-primary/10 hover:text-primary"
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-border text-foreground"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
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
      </DialogContent>
    </Dialog>
  )
}
