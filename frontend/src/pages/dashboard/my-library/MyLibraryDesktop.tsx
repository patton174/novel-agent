import { Link } from 'react-router-dom'
import { Library, Plus, RefreshCw } from 'lucide-react'
import { AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { FileUploader } from '@/components/ui/FileUploader'
import { ProButton } from '@/components/pro/ProButton'
import { ProTable, type ProColumn } from '@/components/pro/ProTable'
import type { CatalogNovel } from '@/api/catalogApi'
import { useTranslation } from 'react-i18next'
import { useMyLibrary } from './useMyLibrary'

/** 我的书库 — 桌面：ProTable（书名/作者/章节数/操作）+ 去书库添加更多链接。 */
export function MyLibraryDesktop() {
  const { t } = useTranslation(['dashboard'])
  const { novels, quotaText, isLoading, load } = useMyLibrary()

  const columns: ProColumn<CatalogNovel>[] = [
    {
      key: 'title',
      header: t('dashboard:myLibrary.colTitle'),
      render: (n) => <span className="font-medium text-foreground">{n.title}</span>,
    },
    {
      key: 'author',
      header: t('dashboard:myLibrary.colAuthor'),
      render: (n) => <span className="text-muted-foreground">{n.author ?? '—'}</span>,
    },
    {
      key: 'chapters',
      header: t('dashboard:myLibrary.colChapters'),
      align: 'right',
      render: (n) => (
        <span className="tabular-nums text-muted-foreground">
          {t('dashboard:myLibrary.chapterCount', { count: n.chapterCount })}
        </span>
      ),
    },
    {
      key: 'action',
      header: t('dashboard:myLibrary.colAction'),
      align: 'right',
      render: () => (
        <ProButton
          size="sm"
          variant="secondary"
          leftIcon={<Plus className="size-4" />}
          onClick={() => void load()}
        >
          {t('dashboard:myLibrary.addToNovel')}
        </ProButton>
      ),
    },
  ]

  return (
    <AppPageStack>
      <AppPageIntro
        eyebrow={t('dashboard:myLibrary.eyebrow')}
        title={t('dashboard:myLibrary.title')}
        icon={Library}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/bookstore">{t('dashboard:myLibrary.browseBookstore')}</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-1 size-4" /> {t('dashboard:myLibrary.refresh')}
            </Button>
          </div>
        }
      />
      {quotaText ? <p className="text-sm text-muted-foreground">{quotaText}</p> : null}

      <FileUploader
        onUploaded={() => {
          /* 列表稍后轮询到 ready 再刷新 */
        }}
        onResolved={() => void load()}
      />

      <ProTable
        columns={columns}
        data={novels ?? []}
        rowKey="id"
        loading={isLoading}
        emptyText={t('dashboard:myLibrary.empty')}
      />
    </AppPageStack>
  )
}
