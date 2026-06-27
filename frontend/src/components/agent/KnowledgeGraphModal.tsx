import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Maximize2, Minus, Plus, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  GraphCanvas,
  darkTheme,
  type GraphCanvasRef,
  type GraphEdge,
  type GraphNode,
  type Theme,
} from 'reagraph'
import { api } from '@/utils/api'

type RawNode = { id: string; name: string; type?: string; aliases?: string }
type RawEdge = { source: string; target: string; rel?: string }

const TYPE_COLORS: Record<string, string> = {
  character: '#38bdf8',
  location: '#34d399',
  item: '#fbbf24',
  faction: '#a78bfa',
  event: '#fb7185',
  unknown: '#94a3b8',
}

const TYPE_LABELS: Record<string, string> = {
  character: '角色',
  location: '地点',
  item: '物品',
  faction: '势力',
  event: '事件',
  unknown: '其他',
}

const KG_THEME: Theme = {
  ...darkTheme,
  canvas: {
    background: '#0b1220',
    fog: '#0b1220',
  },
  node: {
    ...darkTheme.node,
    fill: '#64748b',
    activeFill: '#e2e8f0',
    inactiveOpacity: 0.18,
    label: {
      ...darkTheme.node.label,
      color: '#e2e8f0',
      stroke: '#0b1220',
      activeColor: '#ffffff',
    },
  },
  edge: {
    ...darkTheme.edge,
    fill: '#334155',
    activeFill: '#7dd3fc',
    inactiveOpacity: 0.08,
    label: {
      ...darkTheme.edge.label,
      color: '#94a3b8',
      stroke: '#0b1220',
      activeColor: '#bae6fd',
      fontSize: 5,
    },
  },
  ring: {
    fill: '#1e293b',
    activeFill: '#38bdf8',
  },
  arrow: {
    fill: '#475569',
    activeFill: '#7dd3fc',
  },
}

interface Props {
  novelId: string
  onClose: () => void
}

function sanitizeKnowledgeGraph(nodes: RawNode[], edges: RawEdge[]) {
  const byId = new Map<string, RawNode>()
  for (const node of nodes) {
    if (node.id) byId.set(node.id, node)
  }
  for (const edge of edges) {
    if (edge.source && !byId.has(edge.source)) {
      byId.set(edge.source, { id: edge.source, name: edge.source, type: 'unknown' })
    }
    if (edge.target && !byId.has(edge.target)) {
      byId.set(edge.target, { id: edge.target, name: edge.target, type: 'unknown' })
    }
  }
  const sanitizedNodes = Array.from(byId.values())
  const ids = new Set(sanitizedNodes.map((n) => n.id))
  const sanitizedEdges = edges.filter((e) => ids.has(e.source) && ids.has(e.target))
  return { nodes: sanitizedNodes, edges: sanitizedEdges }
}

function nodeSize(degree: number) {
  return Math.min(16, Math.max(7, 7 + degree * 0.55))
}

export function KnowledgeGraphModal({ novelId, onClose }: Props) {
  const { t } = useTranslation(['editor'])
  const graphRef = useRef<GraphCanvasRef>(null)
  const fitTimerRef = useRef<number | null>(null)

  const [rawNodes, setRawNodes] = useState<RawNode[]>([])
  const [rawEdges, setRawEdges] = useState<RawEdge[]>([])
  const [status, setStatus] = useState<string>('empty')
  const [errorCount, setErrorCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [progress, setProgress] = useState<{
    status: string
    total: number
    done: number
    failed: number
  } | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [errors, setErrors] = useState<
    Array<{ chapterId?: string | null; reason: string; createdAt: number }>
  >([])

  const triggerBackfill = useCallback(async () => {
    try {
      await api.backfillKnowledgeGraph(novelId)
    } catch {
      /* ignore */
    }
  }, [novelId])

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(null)
    setHovered(null)
    try {
      const data = await api.getKnowledgeGraph(novelId)
      setStatus(data.status || 'empty')
      setErrorCount(data.errorCount || 0)
      const nodes = (data.nodes || []).map((n) => ({ ...n }))
      const edges = (data.edges || []).map((e) => ({
        source: e.source,
        target: e.target,
        rel: e.rel,
      }))
      const sanitized = sanitizeKnowledgeGraph(nodes, edges)
      setRawNodes(sanitized.nodes)
      setRawEdges(sanitized.edges)
      if (data.status === 'empty' && data.enabled !== false) {
        void triggerBackfill()
      }
    } catch {
      setStatus('failed')
    } finally {
      setLoading(false)
    }
  }, [novelId, triggerBackfill])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (status !== 'empty' && progress?.status !== 'in_progress') return
    const timer = window.setInterval(async () => {
      try {
        const p = await api.getKnowledgeGraphProgress(novelId)
        setProgress(p)
        if (p.status === 'done' || p.status === 'failed') {
          window.clearInterval(timer)
          await load()
        }
      } catch {
        /* ignore */
      }
    }, 2000)
    return () => window.clearInterval(timer)
  }, [status, progress?.status, novelId, load])

  const degreeMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of rawEdges) {
      map.set(e.source, (map.get(e.source) ?? 0) + 1)
      map.set(e.target, (map.get(e.target) ?? 0) + 1)
    }
    return map
  }, [rawEdges])

  const graphNodes = useMemo<GraphNode[]>(
    () =>
      rawNodes.map((n) => {
        const type = n.type || 'unknown'
        const degree = degreeMap.get(n.id) ?? 0
        return {
          id: n.id,
          label: n.name,
          fill: TYPE_COLORS[type] || TYPE_COLORS.unknown,
          size: nodeSize(degree),
          cluster: type,
          data: { type, aliases: n.aliases, degree },
        }
      }),
    [rawNodes, degreeMap],
  )

  const graphEdges = useMemo<GraphEdge[]>(
    () =>
      rawEdges.map((e, i) => ({
        id: `${e.source}->${e.target}-${i}`,
        source: e.source,
        target: e.target,
        label: e.rel,
      })),
    [rawEdges],
  )

  useEffect(() => {
    if (loading || graphNodes.length === 0) return
    if (fitTimerRef.current) window.clearTimeout(fitTimerRef.current)
    fitTimerRef.current = window.setTimeout(() => {
      graphRef.current?.fitNodesInView(undefined, { animated: true })
    }, 900)
    return () => {
      if (fitTimerRef.current) window.clearTimeout(fitTimerRef.current)
    }
  }, [loading, graphNodes, graphEdges])

  const selectedEntity = rawNodes.find((n) => n.id === selected)
  const selectedRelations = selected
    ? rawEdges.filter((e) => e.source === selected || e.target === selected)
    : []

  const handleLoadErrors = async () => {
    setShowErrors(true)
    try {
      setErrors(await api.getKnowledgeGraphErrors(novelId))
    } catch {
      /* ignore */
    }
  }

  const actives = useMemo(() => {
    const ids = new Set<string>()
    if (selected) ids.add(selected)
    if (hovered) ids.add(hovered)
    if (selected) {
      rawEdges.forEach((e) => {
        if (e.source === selected) ids.add(e.target)
        if (e.target === selected) ids.add(e.source)
      })
    }
    return Array.from(ids)
  }, [selected, hovered, rawEdges])

  const statusColor =
    { ok: 'bg-emerald-500', partial: 'bg-amber-500', empty: 'bg-slate-400', failed: 'bg-rose-500' }[status] ||
    'bg-slate-400'

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        className="flex h-[82vh] w-[92vw] max-w-6xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-2xl"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/20 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`size-2 rounded-full ${statusColor}`} />
            <h2 className="text-lg font-bold tracking-tight">{t('editor:knowledgeGraph.title')}</h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {rawNodes.length} {t('editor:knowledgeGraph.nodes')} · {rawEdges.length}{' '}
              {t('editor:knowledgeGraph.edges')}
            </span>
            {errorCount > 0 ? (
              <button type="button" className="text-xs text-rose-500 underline" onClick={() => void handleLoadErrors()}>
                {errorCount} {t('editor:knowledgeGraph.errors')}
              </button>
            ) : null}
          </div>
          <button type="button" className="rounded-lg p-1.5 hover:bg-muted" onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0b1220]">
          {loading ? (
            <Loader2 className="mx-auto mt-24 size-8 animate-spin text-primary" />
          ) : progress?.status === 'in_progress' ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-200">
              <RefreshCw className="size-6 animate-spin text-muted-foreground" />
              <div className="text-sm">
                {t('editor:knowledgeGraph.backfilling', { done: progress.done, total: progress.total })}
              </div>
            </div>
          ) : rawNodes.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {t('editor:knowledgeGraph.empty')}
            </div>
          ) : (
            <>
              <div className="absolute inset-0">
                <GraphCanvas
                ref={graphRef}
                theme={KG_THEME}
                nodes={graphNodes}
                edges={graphEdges}
                layoutType="forceDirected2d"
                cameraMode="pan"
                animated
                draggable
                labelType="auto"
                edgeInterpolation="curved"
                edgeArrowPosition="end"
                clusterAttribute="cluster"
                selections={selected ? [selected] : []}
                actives={actives}
                defaultNodeSize={8}
                minNodeSize={6}
                maxNodeSize={16}
                onNodeClick={(node) => setSelected((prev) => (prev === node.id ? null : node.id))}
                onNodePointerOver={(node) => setHovered(node.id)}
                onNodePointerOut={() => setHovered(null)}
                onCanvasClick={() => setSelected(null)}
                />
              </div>

              <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5 rounded-xl border border-slate-700/70 bg-slate-900/85 p-2 text-[11px] text-slate-300 backdrop-blur-sm">
                {Object.entries(TYPE_COLORS)
                  .filter(([type]) => type !== 'unknown')
                  .map(([type, color]) => (
                    <span key={type} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5">
                      <span className="size-2.5 rounded-full ring-1 ring-white/20" style={{ background: color }} />
                      {TYPE_LABELS[type]}
                    </span>
                  ))}
              </div>

              <div className="absolute bottom-3 right-3 flex flex-col gap-1 rounded-xl border border-slate-700/70 bg-slate-900/90 p-1 shadow-lg backdrop-blur-sm">
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-200 hover:bg-slate-800"
                  onClick={() => graphRef.current?.zoomIn()}
                  aria-label="Zoom in"
                >
                  <Plus className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-200 hover:bg-slate-800"
                  onClick={() => graphRef.current?.zoomOut()}
                  aria-label="Zoom out"
                >
                  <Minus className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-200 hover:bg-slate-800"
                  onClick={() => graphRef.current?.fitNodesInView(undefined, { animated: true })}
                  aria-label="Fit view"
                >
                  <Maximize2 className="size-4" />
                </button>
              </div>

              <p className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-700/60 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-400 backdrop-blur-sm">
                拖拽平移 · 滚轮缩放 · 拖拽节点 · 点击选中
              </p>
            </>
          )}
        </div>

        {selectedEntity ? (
          <div className="border-t border-border/70 bg-muted/15 px-4 py-3 text-sm">
            <div className="font-medium">
              {selectedEntity.name}{' '}
              <span className="text-xs text-muted-foreground">
                ({TYPE_LABELS[selectedEntity.type || 'unknown'] ?? selectedEntity.type})
              </span>
            </div>
            {selectedEntity.aliases ? (
              <div className="text-xs text-muted-foreground">
                {t('editor:knowledgeGraph.aliases')}: {selectedEntity.aliases}
              </div>
            ) : null}
            <div className="mt-1 max-h-24 overflow-y-auto text-xs text-muted-foreground">
              {selectedRelations.map((r, i) => (
                <div key={i}>
                  {r.source === selected ? `${r.rel ?? '关联'} → ${r.target}` : `${r.source} ← ${r.rel ?? '关联'}`}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {showErrors ? (
          <div className="max-h-32 overflow-y-auto border-t border-border p-3 text-xs">
            {errors.map((e, i) => (
              <div key={i} className="text-rose-500">
                {e.chapterId ? `[${e.chapterId}] ` : ''}
                {e.reason}
              </div>
            ))}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  )
}
