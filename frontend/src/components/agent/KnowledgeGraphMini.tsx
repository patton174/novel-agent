import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/utils/api'
import { SidebarInsightCard } from '@/components/ui/SidebarInsightCard'

type GraphNode = { id: string; name: string; type?: string }
type GraphEdge = { source: string; target: string; rel?: string }

export interface KnowledgeGraphMiniProps {
  novelId?: string | null
  className?: string
}

function layoutNodes(nodes: GraphNode[], _edges: GraphEdge[], size: number) {
  if (nodes.length === 0) {
    return [] as Array<GraphNode & { x: number; y: number }>
  }
  const center = size / 2
  const radius = Math.max(18, size * 0.34)
  return nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / nodes.length - Math.PI / 2
    return {
      ...node,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    }
  })
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

  const positioned = useMemo(() => layoutNodes(nodes, edges, 72), [nodes, edges])
  const nodeById = useMemo(
    () => new Map(positioned.map((node) => [node.id, node])),
    [positioned],
  )

  if (!novelId) {
    return null
  }

  const empty = !loading && nodes.length === 0
  const statusLabel = !enabled
    ? t('editor:timeline.knowledgeGraph.disabled')
    : empty
      ? t('editor:timeline.knowledgeGraph.empty')
      : `${t('editor:timeline.knowledgeGraph.nodes', { count: nodes.length })} · ${t('editor:timeline.knowledgeGraph.edges', { count: edges.length })}`

  const graphIcon = (
    <svg viewBox="0 0 72 72" className="size-full text-foreground" aria-hidden>
      {edges.map((edge, idx) => {
        const from = nodeById.get(edge.source)
        const to = nodeById.get(edge.target)
        if (!from || !to) return null
        return (
          <line
            key={`${edge.source}-${edge.target}-${idx}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="currentColor"
            className="text-muted-foreground/70 dark:text-muted-foreground/55"
            strokeWidth="1.25"
          />
        )
      })}
      {positioned.map((node) => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={5}
            className="fill-muted-foreground dark:fill-muted-foreground/80"
          />
        </g>
      ))}
      {empty ? (
        <>
          <circle
            cx="36"
            cy="36"
            r="10"
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground/55 dark:text-muted-foreground/45"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <circle
            cx="36"
            cy="36"
            r="3"
            className="fill-muted-foreground/45 dark:fill-muted-foreground/35"
          />
        </>
      ) : null}
    </svg>
  )

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
