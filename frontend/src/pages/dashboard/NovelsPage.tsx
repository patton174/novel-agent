import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Novel } from '@/types/novel'
import { fetchNovels } from '@/api/dashboardApi'

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
  const [novels, setNovels] = useState<Novel[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchNovels()
      .then((list) => {
        if (!cancelled) {
          setNovels(list as Novel[])
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

  const loading = novels === null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? '加载中…' : `共 ${novels!.length} 部作品`}
        </p>
        <Button asChild size="sm">
          <Link to="/editor">
            <Plus className="size-4" data-icon="inline-start" />
            新建小说
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : novels!.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {error ? '暂时无法加载小说列表，请稍后重试' : '还没有小说，去编辑器创建第一部作品'}
            </p>
            <Button asChild size="sm">
              <Link to="/editor">进入编辑器</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {novels!.map((novel) => (
            <Card key={novel.id}>
              <CardHeader>
                <CardTitle className="truncate">{novel.title}</CardTitle>
                <CardDescription>更新于 {formatDate(novel.updatedAt)}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to="/editor">打开编辑器</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
