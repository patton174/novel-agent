import { useTranslation } from 'react-i18next'
import { Construction } from 'lucide-react'
import { AdminDataPage, AdminDataPanel, AdminDataPanelBody, AdminDataPanelHeader } from '@/components/layout/AdminDataLayout'
import { PIXEL_PANEL } from '@/components/pixel'
import { cn } from '@/lib/utils'

export function AdminPlaceholderPage({
  titleKey,
  descKey,
  hintKey = 'admin:placeholder.defaultHint',
}: {
  titleKey: string
  descKey: string
  hintKey?: string
}) {
  const { t } = useTranslation(['admin'])

  return (
    <AdminDataPage>
      <AdminDataPanel>
        <AdminDataPanelHeader title={t(titleKey)} description={t(descKey)} />
        <AdminDataPanelBody>
          <div className={cn(PIXEL_PANEL, 'flex flex-col items-center gap-3 py-14 text-center')}>
            <Construction className="size-10 text-muted-foreground" aria-hidden />
            <p className="max-w-md text-sm text-muted-foreground">{t(hintKey)}</p>
          </div>
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}
