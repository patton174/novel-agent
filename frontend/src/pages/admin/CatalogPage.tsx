import { CatalogAdminPanel } from '@/components/admin/CatalogAdminPanel'
import { AppPageStack } from '@/components/layout/AppPageStack'

export default function CatalogPage() {
  return (
    <AppPageStack>
      <CatalogAdminPanel />
    </AppPageStack>
  )
}
