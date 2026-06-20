import { BookMarked, BookOpen, Plus } from 'lucide-react'
import { ProButton } from '@/components/pro/ProButton'
import type { CatalogNovel } from '@/api/catalogApi'
import { useTranslation } from 'react-i18next'

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

export interface BookstoreCardProps {
  novel: CatalogNovel
  index: number
  addingId: string | null
  collectingId: string | null
  onAdd: (id: string) => void
  onCollect: (id: string) => void
}

/** 书店作品卡 — 桌面网格与手机单列共用。 */
export function BookstoreCard({
  novel,
  index,
  addingId,
  collectingId,
  onAdd,
  onCollect,
}: BookstoreCardProps) {
  const { t } = useTranslation(['dashboard'])
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-hover">
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
        {novel.author ? <p className="mt-1 text-sm text-muted-foreground">{novel.author}</p> : null}
        {novel.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {novel.description}
          </p>
        ) : null}
        <p className="mt-auto pt-3 text-xs text-muted-foreground">
          {t('dashboard:bookstore.chapterCount', { count: novel.chapterCount })}
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/80 p-4">
        <ProButton
          variant="primary"
          size="lg"
          className="w-full"
          loading={addingId === novel.id}
          leftIcon={<Plus className="size-4" />}
          onClick={() => onAdd(novel.id)}
        >
          {t('dashboard:bookstore.addToLibrary')}
        </ProButton>
        <ProButton
          variant="secondary"
          size="lg"
          className="w-full"
          loading={collectingId === novel.id}
          leftIcon={<BookMarked className="size-4" />}
          onClick={() => onCollect(novel.id)}
        >
          {t('dashboard:bookstore.collectToMyLibrary')}
        </ProButton>
      </div>
    </article>
  )
}
