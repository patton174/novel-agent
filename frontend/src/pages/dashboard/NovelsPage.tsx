import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { BookOpen, Clock, ImagePlus, Plus, Sparkles } from 'lucide-react'
import { CoverGenerateDialog } from '@/components/dashboard/CoverGenerateDialog'
import { CoverImageGeneratingOverlay } from '@/components/dashboard/CoverImageGeneratingOverlay'
import { Button } from '@/components/ui/button'
import { ContentPending } from '@/components/loading/ContentPending'
import { InlineBrandLoader } from '@/components/loading/BrandLoader'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { fetchNovels, generateNovelCover, type DashboardNovel } from '@/api/dashboardApi'
import { dashboardCache } from '@/stores/dashboardCacheStore'
import { appToast } from '@/stores/appToastStore'

function formatDate(ts: number): string {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function NovelsPage() {
  useMarkRouteSeen()
  const [novels, setNovels] = useState<DashboardNovel[] | null>(() => dashboardCache.getNovels())
  const [error, setError] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [dialogNovel, setDialogNovel] = useState<DashboardNovel | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchNovels()
      .then((list) => {
        if (!cancelled) {
          dashboardCache.setNovels(list)
          setNovels(list)
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNovels([])
          setError(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleGenerateCover = useCallback(async (novelId: string, prompt: string) => {
    setGeneratingId(novelId)
    try {
      const updated = await generateNovelCover(novelId, prompt)
      if (updated) {
        setNovels((prev) =>
          prev ? prev.map((n) => (n.id === novelId ? { ...n, ...updated } : n)) : prev,
        )
        appToast.success('封面已生成')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '封面生成失败'
      appToast.error(message.includes('套餐') ? `${message}，请前往定价页升级` : message)
    } finally {
      setGeneratingId(null)
    }
  }, [])

  const loading = novels === null

  return (
    <AppPageStack wide>
      <CoverGenerateDialog
        open={dialogNovel != null}
        novelId={dialogNovel?.id ?? null}
        novelTitle={dialogNovel?.title ?? ''}
        onOpenChange={(open) => {
          if (!open) {
            setDialogNovel(null)
          }
        }}
        onConfirm={async (prompt) => {
          if (!dialogNovel) {
            return
          }
          await handleGenerateCover(dialogNovel.id, prompt)
        }}
      />

      <AppPageIntro
        eyebrow="作品库"
        title={
          loading ? (
            <InlineBrandLoader label="正在加载作品" className="text-base" />
          ) : (
            `共 ${novels!.length} 部作品`
          )
        }
        icon={BookOpen}
        action={
          <Button asChild className="rounded-xl px-5">
            <Link to="/editor">
              <Plus className="mr-2 size-4" />
              新建小说
            </Link>
          </Button>
        }
      />

      {loading ? (
        <ContentPending label="正在加载作品列表" />
      ) : novels!.length === 0 ? (
        <AppEmptyState
          icon={Sparkles}
          title={error ? '加载失败' : '开始你的创作之旅'}
          description={
            error
              ? '暂时无法加载小说列表，请稍后刷新重试。'
              : '创建一个新的小说项目，让 AI 助手帮你构建世界观、大纲和章节。'
          }
          action={
            !error ? (
              <Button
                asChild
                className="rounded-xl bg-primary px-8 text-primary-foreground shadow-md hover:bg-primary/90"
              >
                <Link to="/editor">
                  <Plus className="mr-2 size-5" />
                  创建第一部作品
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {novels!.map((novel, index) => {
            const isGenerating = generatingId === novel.id
            return (
              <article
                key={novel.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-hover"
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-violet-500 to-indigo-400 opacity-80"
                  style={{ opacity: 0.35 + (index % 3) * 0.15 }}
                />
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                  <AnimatePresence mode="wait">
                    {novel.coverUrl && !isGenerating ? (
                      <motion.img
                        key={novel.coverUrl}
                        src={novel.coverUrl}
                        alt={`${novel.title} 封面`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        initial={{ opacity: 0, filter: 'blur(12px)', scale: 1.04 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ) : !isGenerating ? (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-violet-500/10">
                        <BookOpen className="size-12 text-primary/40" />
                      </div>
                    ) : null}
                  </AnimatePresence>
                  <CoverImageGeneratingOverlay active={isGenerating} />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3
                    className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-foreground"
                    title={novel.title}
                  >
                    {novel.title}
                  </h3>

                  {novel.genre ? (
                    <span className="mb-3 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground/70">
                      {novel.genre}
                    </span>
                  ) : null}

                  <div className="mt-auto flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1.5 size-3.5 shrink-0" />
                    更新于 {formatDate(novel.updatedAt)}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-border/80 p-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isGenerating}
                    className="w-full rounded-xl border-border/90 text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    onClick={() => setDialogNovel(novel)}
                  >
                    <ImagePlus className="mr-2 size-4" />
                    {novel.coverUrl ? '重新生成封面' : 'AI 生成封面'}
                  </Button>
                  <Button
                    asChild
                    className="w-full rounded-xl"
                  >
                    <Link to="/editor">继续写作</Link>
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </AppPageStack>
  )
}
