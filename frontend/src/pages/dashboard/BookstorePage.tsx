import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookMarked, Loader2, Plus } from 'lucide-react'
import {
  addCatalogToLibrary,
  fetchCatalogNovels,
  type CatalogNovel,
} from '@/api/catalogApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { appToast } from '@/stores/appToastStore'

export default function BookstorePage() {
  const [novels, setNovels] = useState<CatalogNovel[] | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const page = await fetchCatalogNovels(1, 50)
      setNovels(page.list)
    } catch (err) {
      setNovels([])
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-12">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-violet-500/[0.06] via-surface to-primary/[0.04] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookMarked className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">公共书库</p>
            <p className="text-lg font-bold">浏览 AI 爬取的作品，一键加入我的小说</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : novels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
          书库暂无作品，管理员启动爬虫后会出现在这里
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {novels.map((novel) => (
            <article
              key={novel.id}
              className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-soft"
            >
              <h3 className="line-clamp-2 text-lg font-bold">{novel.title}</h3>
              {novel.author ? (
                <p className="mt-1 text-sm text-muted-foreground">{novel.author}</p>
              ) : null}
              {novel.description ? (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{novel.description}</p>
              ) : null}
              <p className="mt-auto pt-4 text-xs text-muted-foreground">共 {novel.chapterCount} 章</p>
              <div className="mt-3 flex gap-2">
                <Button
                  className="flex-1 rounded-xl"
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
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/dashboard/novels">去作品库</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
