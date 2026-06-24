import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PixelIcons } from '@/components/icons/PixelIcons'
import { api } from '@/utils/api'
import { SidebarInsightCard } from '@/components/ui/SidebarInsightCard'

type GraphNode = { id: string; name: string; type?: string }
type GraphEdge = { source: string; target: string; rel?: string }

export interface KnowledgeGraphMiniProps {
  novelId?: string | null
  className?: string
}

export function KnowledgeGraphMini({ novelId, className }: KnowledgeGraphMiniProps) {
  const { t } = useTranslation(['editor'])
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!novelId) {
      setNodes([])
      setEdges([])
      return
    }
    let cancelled = false
    setLoading(true)
    void api
      .getKnowledgeGraph(novelId)
      .then((data) => {
        if (cancelled) return
        setEnabled(data.enabled !== false)
        setNodes(Array.isArray(data.nodes) ? data.nodes : [])
        setEdges(Array.isArray(data.edges) ? data.edges : [])
      })
      .catch(() => {
        if (!cancelled) {
          setNodes([])
          setEdges([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [novelId])

  const nodeCount = nodes.length
  const edgeCount = edges.length

  if (!novelId) {
    return null
  }

  const empty = !loading && nodeCount === 0
  const statusLabel = !enabled
    ? t('editor:timeline.knowledgeGraph.disabled')
    : empty
      ? t('editor:timeline.knowledgeGraph.empty')
      : `${t('editor:timeline.knowledgeGraph.nodes', { count: nodeCount })} · ${t('editor:timeline.knowledgeGraph.edges', { count: edgeCount })}`

  const graphIcon = useMemo(() => <PixelIcons.Graph />, [])

  return (
    <SidebarInsightCard
      data-testid="knowledge-graph-mini"
      className={className}
      icon={graphIcon}
      title={t('editor:timeline.knowledgeGraph.title')}
      subtitle={loading ? '…' : statusLabel}
    />
  )
}
