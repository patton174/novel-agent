import { useNavigate } from 'react-router-dom'
import { CatalogAdminPanel } from '@/components/admin/CatalogAdminPanel'
import { AppPageStack } from '@/components/layout/AppPageStack'

export default function CatalogPage() {
  const navigate = useNavigate()

  return (
    <AppPageStack>
      <CatalogAdminPanel
        onOpenJob={(jobId) => {
          navigate('/admin/crawler', { state: { openJobId: jobId } })
        }}
      />
    </AppPageStack>
  )
}
