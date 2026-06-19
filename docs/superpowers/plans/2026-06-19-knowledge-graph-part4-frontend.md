# Part 4 — 前端实现计划

> 主索引：[2026-06-19-knowledge-graph.md](./2026-06-19-knowledge-graph.md) ｜ [Part 3](./2026-06-19-knowledge-graph-part3-python.md)
> 设计：[册2 §5](../specs/2026-06-19-knowledge-graph-design-part2.md)
> 约定：`api.request<T>` 用 secureFetch+parseResultResponse；前端测试 `cd frontend && npx vitest run`；`npx tsc --noEmit`。

---

## Task 16: d3-force 依赖 + api 扩展

**Files:**
- Modify: `frontend/package.json`（加 d3-force + @types/d3-force）
- Modify: `frontend/src/utils/api.ts`（加 backfill/progress/errors）

- [ ] **Step 1: 装 d3-force**

```bash
cd frontend && npm i d3-force @types/d3-force
```
（`d3-force` 独立包，不引全量 d3。）

- [ ] **Step 2: api.ts 加 KG 方法**

在 `getKnowledgeGraph` 后加：
```ts
  backfillKnowledgeGraph(novelId: string) {
    return this.request<{ status: string }>(`/content/auth/novels/${novelId}/knowledge-graph/backfill`, { method: 'POST' })
  },
  getKnowledgeGraphProgress(novelId: string) {
    return this.request<{ status: string; total: number; done: number; failed: number }>(`/content/auth/novels/${novelId}/knowledge-graph/progress`)
  },
  getKnowledgeGraphErrors(novelId: string) {
    return this.request<Array<{ chapterId?: string | null; reason: string; createdAt: number }>>(`/content/auth/novels/${novelId}/knowledge-graph/errors`)
  },
```
（`getKnowledgeGraph` 返回类型加 `status?: string; errorCount?: number`：）
```ts
  getKnowledgeGraph(novelId: string) {
    return this.request<{
      enabled?: boolean
      status?: string
      nodes?: Array<{ id: string; name: string; type?: string; aliases?: string }>
      edges?: Array<{ source: string; target: string; rel?: string }>
      errorCount?: number
      note?: string
    }>(`/content/auth/novels/${novelId}/knowledge-graph`)
  },
```

- [ ] **Step 3: 类型检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "api.ts" || echo "no new errors"
```

- [ ] **Step 4: 提交**

```bash
git add frontend/package.json frontend/src/utils/api.ts
git commit -m "feat(kg): d3-force 依赖 + api 扩展 backfill/progress/errors"
```

---

## Task 17: KnowledgeGraphModal（d3-force SVG）

**Files:**
- Create: `frontend/src/components/agent/KnowledgeGraphModal.tsx`

> d3-force 力导向布局 + SVG 渲染。滚轮缩放、拖拽节点、点击高亮邻居、状态徽章、回填进度、错误列表。

- [ ] **Step 1: 写组件**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { forceCenter, forceLink, forceManyBody, forceSimulation } from 'd3-force'
import { Loader2, RefreshCw, X } from 'lucide-react'
import { api } from '@/utils/api'
import { appToast } from '@/stores/appToastStore'
import { useTranslation } from 'react-i18next'

type GraphNode = { id: string; name: string; type?: string; aliases?: string; x?: number; y?: number; vx?: number; vy?: number }
type GraphEdge = { source: string; target: string; rel?: string }

const TYPE_COLORS: Record<string, string> = {
  character: '#0ea5e9', location: '#10b981', item: '#f59e0b',
  faction: '#8b5cf6', event: '#f43f5e', unknown: '#94a3b8',
}

interface Props {
  novelId: string
  onClose: () => void
}

export function KnowledgeGraphModal({ novelId, onClose }: Props) {
  const { t } = useTranslation(['editor'])
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [status, setStatus] = useState<string>('empty')
  const [errorCount, setErrorCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ status: string; total: number; done: number; failed: number } | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [errors, setErrors] = useState<Array<{ chapterId?: string; reason: string; createdAt: number }>>([])
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getKnowledgeGraph(novelId)
      setStatus(data.status || 'empty')
      setErrorCount(data.errorCount || 0)
      setNodes((data.nodes || []).map((n) => ({ ...n })))
      setEdges(data.edges || [])
      if ((data.status === 'empty') && data.enabled !== false) {
        void triggerBackfill()
      }
    } catch {
      setStatus('failed')
    } finally {
      setLoading(false)
    }
  }, [novelId])

  useEffect(() => { void load() }, [load])

  // 自动回填
  const triggerBackfill = useCallback(async () => {
    try {
      await api.backfillKnowledgeGraph(novelId)
    } catch { /* ignore */ }
  }, [novelId])

  // 进度轮询
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
      } catch { /* ignore */ }
    }, 2000)
    return () => window.clearInterval(timer)
  }, [status, progress?.status, novelId, load])

  // d3-force 布局
  const positioned = useMemo(() => {
    if (nodes.length === 0) return { nodes: [], edges: [] }
    const simNodes = nodes.map((n) => ({ ...n }))
    const simEdges = edges.map((e) => ({ source: e.source, target: e.target, rel: e.rel }))
    const sim = forceSimulation(simNodes as any)
      .force('link', forceLink(simEdges as any).id((d: any) => d.id).distance(60))
      .force('charge', forceManyBody().strength(-120))
      .force('center', forceCenter(300, 300))
      .stop()
    for (let i = 0; i < 120; i++) sim.tick()
    return { nodes: simNodes, edges: simEdges }
  }, [nodes, edges])

  const neighbors = useMemo(() => {
    if (!selected) return null
    const ids = new Set<string>([selected])
    edges.forEach((e) => {
      if (e.source === selected) ids.add(e.target)
      if (e.target === selected) ids.add(e.source)
    })
    return ids
  }, [selected, edges])

  const selectedEntity = nodes.find((n) => n.id === selected)
  const selectedRelations = selected ? edges.filter((e) => e.source === selected || e.target === selected) : []

  const handleLoadErrors = async () => {
    setShowErrors(true)
    try { setErrors(await api.getKnowledgeGraphErrors(novelId)) } catch { /* ignore */ }
  }

  const handleWheel = (e: React.WheelEvent) => {
    setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)))
  }

  const statusColor = { ok: 'bg-emerald-500', partial: 'bg-amber-500', empty: 'bg-slate-400', failed: 'bg-rose-500' }[status] || 'bg-slate-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex h-[80vh] w-[90vw] max-w-5xl flex-col rounded-2xl bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <span className={`size-2 rounded-full ${statusColor}`} />
            <h2 className="text-lg font-bold">{t('editor:knowledgeGraph.title')}</h2>
            <span className="text-sm text-muted-foreground">{nodes.length} {t('editor:knowledgeGraph.nodes')} · {edges.length} {t('editor:knowledgeGraph.edges')}</span>
            {errorCount > 0 ? (
              <button className="text-sm text-rose-500 underline" onClick={() => void handleLoadErrors()}>
                {errorCount} {t('editor:knowledgeGraph.errors')}
              </button>
            ) : null}
          </div>
          <button onClick={onClose}><X className="size-5" /></button>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {loading ? (
            <Loader2 className="mx-auto mt-20 size-8 animate-spin" />
          ) : progress?.status === 'in_progress' ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <RefreshCw className="size-6 animate-spin text-muted-foreground" />
              <div className="text-sm">{t('editor:knowledgeGraph.backfilling', { done: progress.done, total: progress.total })}</div>
              {progress.failed > 0 ? <div className="text-xs text-rose-500">{progress.failed} {t('editor:knowledgeGraph.failed')}</div> : null}
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">{t('editor:knowledgeGraph.empty')}</div>
          ) : (
            <svg ref={svgRef} className="h-full w-full" onWheel={handleWheel}>
              <g transform={`translate(0,0) scale(${zoom})`}>
                {positioned.edges.map((e, i) => {
                  const s = positioned.nodes.find((n) => n.id === (e.source as any).id || n.id === e.source)
                  const t = positioned.nodes.find((n) => n.id === (e.target as any).id || n.id === e.target)
                  if (!s || !t) return null
                  const dim = neighbors && !(neighbors.has(s.id!) && neighbors.has(t.id!))
                  return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="currentColor" className={dim ? 'text-muted-foreground/20' : 'text-muted-foreground/50'} strokeWidth={1} />
                })}
                {positioned.nodes.map((n) => {
                  const dim = neighbors && !neighbors.has(n.id!)
                  const isSel = selected === n.id
                  return (
                    <g key={n.id} transform={`translate(${n.x},${n.y})`} className="cursor-pointer" onClick={() => setSelected(isSel ? null : n.id!)}>
                      <circle r={isSel ? 9 : 7} fill={TYPE_COLORS[n.type || 'unknown'] || TYPE_COLORS.unknown} opacity={dim ? 0.25 : 1} />
                      <text dy={18} textAnchor="middle" className="fill-foreground text-[10px]" opacity={dim ? 0.3 : 1}>{n.name}</text>
                    </g>
                  )
                })}
              </g>
            </svg>
          )}
        </div>

        {selectedEntity ? (
          <div className="border-t border-border p-4 text-sm">
            <div className="font-medium">{selectedEntity.name} <span className="text-xs text-muted-foreground">({selectedEntity.type})</span></div>
            {selectedEntity.aliases ? <div className="text-xs text-muted-foreground">{t('editor:knowledgeGraph.aliases')}: {selectedEntity.aliases}</div> : null}
            <div className="mt-1 text-xs text-muted-foreground">{t('editor:knowledgeGraph.relations')}:</div>
            <ul className="text-xs">
              {selectedRelations.map((r, i) => (
                <li key={i}>{r.source === selected ? `${r.rel} → ${r.target}` : `${r.source} ← ${r.rel}`}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {showErrors ? (
          <div className="max-h-40 overflow-y-auto border-t border-border p-4 text-xs">
            {errors.map((e, i) => (
              <div key={i} className="text-rose-500">{e.chapterId ? `[${e.chapterId}] ` : ''}{e.reason}</div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep KnowledgeGraphModal || echo "no errors"
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/agent/KnowledgeGraphModal.tsx
git commit -m "feat(kg): KnowledgeGraphModal d3-force 全图模态"
```

---

## Task 18: KnowledgeGraphMini 改造（点击开模态+状态点）

**Files:**
- Modify: `frontend/src/components/agent/KnowledgeGraphMini.tsx`

- [ ] **Step 1: mini 卡加点击 + 状态点**

在 `KnowledgeGraphMini` 组件加 `modalOpen` state + 点击 `SidebarInsightCard` 开模态。`SidebarInsightCard` 已有 `onClick` prop（模块5 探索确认）。
在组件内加：
```tsx
  const [modalOpen, setModalOpen] = useState(false)
  const statusColor = {
    ok: 'bg-emerald-500', partial: 'bg-amber-500', empty: 'bg-slate-400', failed: 'bg-rose-500'
  }[status] || 'bg-slate-400'
```
（`status` 从 `api.getKnowledgeGraph` 返回取，存 state。）
`SidebarInsightCard` 加 `onClick={() => setModalOpen(true)}` + trailing 加状态点 `<span className={`size-2 rounded-full ${statusColor}`} />`。
组件末尾加：
```tsx
  {modalOpen && novelId ? (
    <KnowledgeGraphModal novelId={novelId} onClose={() => setModalOpen(false)} />
  ) : null}
```
（import `KnowledgeGraphModal`。`status` state 需在 fetch effect 里 set：`setStatus(data.status || 'empty')`。）

- [ ] **Step 2: 类型检查 + dev 验证**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep KnowledgeGraphMini || echo "no errors"
```
`npm run dev`，点 mini 卡 → 模态打开。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/agent/KnowledgeGraphMini.tsx
git commit -m "feat(kg): KnowledgeGraphMini 点击开模态 + 状态点"
```

---

## Task 19: i18n + 端到端验证

**Files:**
- Modify: `frontend/src/i18n/locales/zh/editor.json` + `en/editor.json`

- [ ] **Step 1: zh editor.json 加 knowledgeGraph 组**

```json
"knowledgeGraph": {
  "title": "知识图谱",
  "nodes": "实体",
  "edges": "关系",
  "errors": "章抽取失败",
  "backfilling": "回填中 {{done}}/{{total}}",
  "failed": "失败",
  "empty": "暂无图谱，保存章节或等待回填",
  "aliases": "别名",
  "relations": "关联"
}
```

- [ ] **Step 2: en editor.json 加对应英文**

```json
"knowledgeGraph": {
  "title": "Knowledge Graph",
  "nodes": "nodes",
  "edges": "edges",
  "errors": "chapters failed",
  "backfilling": "Backfilling {{done}}/{{total}}",
  "failed": "failed",
  "empty": "No graph yet — save chapters or wait for backfill",
  "aliases": "Aliases",
  "relations": "Relations"
}
```

- [ ] **Step 3: 端到端验证**

```bash
cd d:/Users/JZJ/Desktop/agent && powershell -ExecutionPolicy Bypass -File scripts/_restart-dev-stack.ps1
```
1. 有 KG 小说：点 mini 卡 → 模态全图，缩放拖拽，点节点看邻居
2. 无 KG 旧小说：点 mini 卡 → 自动回填 → 进度条 → 完成显示图
3. 部分失败：模态 partial + 点错误列表

- [ ] **Step 4: 全量测试回归 + 提交**

```bash
cd frontend && npx vitest run 2>&1 | tail -8
cd ../python-ai && python -m pytest tests/test_kg_*.py -q
git add frontend/src/i18n/locales/zh/editor.json frontend/src/i18n/locales/en/editor.json
git commit -m "feat(kg): i18n + 端到端验证收尾"
```

---

Part 4 完成。模块 1 全部实现完毕。

返回 [主索引](./2026-06-19-knowledge-graph.md)。
