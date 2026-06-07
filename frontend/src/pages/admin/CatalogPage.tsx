import { useNavigate } from 'react-router-dom'
import { CatalogAdminPanel } from '@/components/admin/CatalogAdminPanel'

export default function CatalogPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">书库管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看入库书籍、阅读章节正文，未完成书目可跳转爬虫页续爬
        </p>
      </div>
      <CatalogAdminPanel
        onOpenJob={(jobId) => {
          navigate('/admin/crawler', { state: { openJobId: jobId } })
        }}
      />
    </div>
  )
}
