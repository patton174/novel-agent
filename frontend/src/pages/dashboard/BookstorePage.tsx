import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { BookMarked, BookOpen, Loader2, Plus, RefreshCw } from 'lucide-react'
import {
  addCatalogToLibrary,
  fetchCatalogNovels,
  type CatalogNovel,
} from '@/api/catalogApi'
import { Button } from '@/components/ui/button'
import { APP_BTN_FULL_MD, APP_BTN_MD } from '@/lib/appButtonTokens'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

function CatalogCover({ novel }: { novel: CatalogNovel }) {
  if (novel.coverUrl) {
    return (
      <img
        src={novel.coverUrl}
        alt={`${novel.title} 封面`}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        loading="lazy"
      />
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-violet-500/10">
      <BookOpen className="size-12 text-primary/40" />
    </div>
  )
}

export default function BookstorePage() {
  useMarkRouteSeen()
  const [novels, setNovels] = useState<CatalogNovel[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const page = await fetchCatalogNovels(1, 50)
      setNovels(page.list)
    } catch (err) {
      setNovels([])
      setLoadError(true)
      appToast.error(err instanceof Error ? err.message : '加载书库失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleAdd = async (catalogNovelId: string) => {
    setAddingId(catalogNovelId)
    try {
      await addCatalogToLibrary(catalogNovelId)
      appToast.success('已添加到你的作品库')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '添加失败')
    } finally {
      setAddingId(null)
    }
  }

  const loading = novels === null

  return (
    <AppPageStack>
      <AppPageIntro
        eyebrow="公共书库"
        title="浏览 AI 爬取的作品，一键加入我的小说"
        icon={BookMarked}
        action={
          <Button asChild variant="outline" className={APP_BTN_MD}>
            <Link to="/dashboard/novels">我的作品库</Link>
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] min-h-[320px] rounded-2xl" />
          ))}
        </div>
      ) : loadError ? (
        <AppEmptyState
          icon={BookMarked}
          title="书库加载失败"
          description="暂时无法获取公共书库列表，请检查网络后重试。"
          action={
            <Button className={APP_BTN_MD} onClick={() => void load()}>
              <RefreshCw className="mr-2 size-4" />
              重新加载
            </Button>
          }
        />
      ) : novels.length === 0 ? (
        <AppEmptyState
          icon={BookMarked}
          title="书库暂无作品"
          description="管理员启动爬虫任务后，收录的作品会出现在这里，你可以一键加入个人作品库继续创作。"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {novels.map((novel, index) => (
            <article
              key={novel.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-hover"
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-violet-500 to-indigo-400"
                style={{ opacity: 0.35 + (index % 3) * 0.15 }}
              />
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                <CatalogCover novel={novel} />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3
                  className="line-clamp-2 text-lg font-bold leading-snug text-foreground"
                  title={novel.title}
                >
                  {novel.title}
                </h3>
                {novel.author ? (
                  <p className="mt-1 text-sm text-muted-foreground">{novel.author}</p>
                ) : null}
                {novel.description ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {novel.description}
                  </p>
                ) : null}
                <p className="mt-auto pt-3 text-xs text-muted-foreground">共 {novel.chapterCount} 章</p>
              </div>

              <div className="flex flex-col gap-2 border-t border-border/80 p-4">
                <Button
                  className={APP_BTN_FULL_MD}
                  disabled={addingId === novel.id}
                  onClick={() => void handleAdd(novel.id)}
                >
                  {addingId === novel.id ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 size-4" />
                  )}
                  加入我的作品
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppPageStack>
  )
}
