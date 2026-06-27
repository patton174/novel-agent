import { Link } from 'react-router-dom'
import { BookMarked, RefreshCw } from 'lucide-react'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { useTranslation } from 'react-i18next'
import { useBookstore } from './useBookstore'
import { BookstoreCard } from './BookstoreCard'

/** 公共书库 — 手机：单列卡片栈。 */
export function BookstoreMobile() {
  const { t } = useTranslation(['dashboard'])
  const { novels, loadError, addingId, collectingId, loading, load, handleAdd, handleCollect } =
    useBookstore()

  return (
    <AppPageStack>
      <AppPageIntro
        eyebrow={t('dashboard:bookstore.eyebrow')}
        title={t('dashboard:bookstore.title')}
        icon={BookMarked}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/my-library">{t('dashboard:bookstore.myLibrary')}</Link>
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] min-h-[280px] rounded-2xl" />
          ))}
        </div>
      ) : loadError ? (
        <AppEmptyState
          icon={BookMarked}
          title={t('dashboard:bookstore.loadFailTitle')}
          description={t('dashboard:bookstore.loadFailDesc')}
          action={
            <Button className={APP_BTN_MD} onClick={() => void load()}>
              <RefreshCw className="mr-2 size-4" />
              {t('dashboard:bookstore.reload')}
            </Button>
          }
        />
      ) : novels && novels.length === 0 ? (
        <AppEmptyState
          icon={BookMarked}
          title={t('dashboard:bookstore.emptyTitle')}
          description={t('dashboard:bookstore.emptyDesc')}
        />
      ) : (
        <div className="space-y-4">
          {novels?.map((novel, index) => (
            <BookstoreCard
              key={novel.id}
              novel={novel}
              index={index}
              addingId={addingId}
              collectingId={collectingId}
              onAdd={(id) => void handleAdd(id)}
              onCollect={(id) => void handleCollect(id)}
            />
          ))}
        </div>
      )}
    </AppPageStack>
  )
}
