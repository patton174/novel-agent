# Part 4 — 前端实现计划

> 主索引：[2026-06-19-crawler.md](./2026-06-19-crawler.md) ｜ [Part 3](./2026-06-19-crawler-part3-python.md)
> 设计：[册2 §5](../specs/2026-06-19-crawler-design-part2.md)
> 约定：`secureFetch`/`parseResultResponse`；admin 走 cookie JWT。前端测试 `cd frontend && npx vitest run`；`npx tsc --noEmit`。

---

## Task 16: useCrawlStream hook

**Files:**
- Create: `frontend/src/hooks/useCrawlStream.ts`

> EventSource 订阅 `/api/content/crm/crawl/stream`，分发 decision/status/log 回调。EventSource 走 cookie 鉴权（不带 header）。

- [ ] **Step 1: 写 hook**

```ts
import { useEffect, useRef } from 'react'

interface UseCrawlStreamOptions {
  onDecision?: (decision: string) => void
  onJobStatus?: (jobId: string, status: string) => void
  onJobLog?: (jobId: string, level: string, message: string) => void
  enabled?: boolean
}

/** 订阅爬虫 SSE 流。EventSource 走 cookie 鉴权。 */
export function useCrawlStream(opts: UseCrawlStreamOptions = {}) {
  const { onDecision, onJobStatus, onJobLog, enabled = true } = opts
  const cbRef = useRef({ onDecision, onJobStatus, onJobLog })
  cbRef.current = { onDecision, onJobStatus, onJobLog }

  useEffect(() => {
    if (!enabled) return
    const es = new EventSource('/api/content/crm/crawl/stream', { withCredentials: true })

    es.addEventListener('orchestrator_decision', (e) => {
      try { cbRef.current.onDecision?.(JSON.parse(e.data).decision) } catch {}
    })
    es.addEventListener('job_status', (e) => {
      try {
        const d = JSON.parse(e.data)
        cbRef.current.onJobStatus?.(d.jobId, d.status)
      } catch {}
    })
    es.addEventListener('job_log', (e) => {
      try {
        const d = JSON.parse(e.data)
        cbRef.current.onJobLog?.(d.jobId, d.level, d.message)
      } catch {}
    })
    es.onerror = () => { /* EventSource 自动重连 */ }

    return () => es.close()
  }, [enabled])
}
```
（`withCredentials: true` 携带 cookie JWT。EventSource 原生断线重连。）

- [ ] **Step 2: 类型检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep useCrawlStream || echo "no errors"
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/hooks/useCrawlStream.ts
git commit -m "feat(crawl): useCrawlStream SSE hook"
```

---

## Task 17: crawlAdminApi createCrawlJob 加字段

**Files:**
- Modify: `frontend/src/api/crawlAdminApi.ts`

- [ ] **Step 1: createCrawlJob 签名加字段**

```ts
export async function createCrawlJob(payload: {
  sourceUrl: string
  configJson?: string
  priority?: number
  maxRetries?: number
  scheduleCron?: string
}): Promise<CrawlJob> {
  const res = await secureFetch('/api/content/crm/crawl/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(res.status === 403 ? '无管理权限' : '创建失败')
  return parseResultResponse<CrawlJob>(res)
}
```
（`CrawlJob` 类型加 `priority?/maxRetries?/retryCount?/scheduleCron?/nextRunAt?` 字段——找其定义处补。）

- [ ] **Step 2: 类型检查 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep crawlAdminApi || echo "no errors"
git add frontend/src/api/crawlAdminApi.ts
git commit -m "feat(crawl): createCrawlJob 加 priority/maxRetries/scheduleCron"
```

---

## Task 18: CrawlJobCreateDialog

**Files:**
- Create: `frontend/src/components/admin/CrawlJobCreateDialog.tsx`

- [ ] **Step 1: 写弹窗**

```tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { appToast } from '@/stores/appToastStore'
import { useTranslation } from 'react-i18next'
import { createCrawlJob } from '@/api/crawlAdminApi'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CrawlJobCreateDialog({ open, onClose, onCreated }: Props) {
  const { t } = useTranslation(['admin'])
  const [sourceUrl, setSourceUrl] = useState('')
  const [priority, setPriority] = useState(1)
  const [maxRetries, setMaxRetries] = useState(3)
  const [scheduleCron, setScheduleCron] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const handleSubmit = async () => {
    if (!sourceUrl.trim()) { appToast.error(t('admin:crawler.urlRequired')); return }
    setBusy(true)
    try {
      await createCrawlJob({ sourceUrl, priority, maxRetries, scheduleCron: scheduleCron || undefined })
      appToast.success(t('admin:crawler.createOk'))
      setSourceUrl(''); setScheduleCron('')
      onCreated(); onClose()
    } catch (e) {
      appToast.error(e instanceof Error ? e.message : t('admin:crawler.createFail'))
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-96 rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">{t('admin:crawler.createTitle')}</h3>
        <div className="space-y-3">
          <Input placeholder={t('admin:crawler.sourceUrl')} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
          <div className="flex gap-2">
            <label className="flex items-center gap-1 text-sm">
              {t('admin:crawler.priority')}
              <select className="rounded border bg-surface px-1 py-0.5" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                <option value={0}>{t('admin:crawler.priorityHigh')}</option>
                <option value={1}>{t('admin:crawler.priorityNormal')}</option>
                <option value={2}>{t('admin:crawler.priorityLow')}</option>
              </select>
            </label>
            <label className="flex items-center gap-1 text-sm">
              {t('admin:crawler.maxRetries')}
              <Input type="number" className="w-16" value={maxRetries} onChange={(e) => setMaxRetries(Number(e.target.value))} />
            </label>
          </div>
          <Input placeholder={t('admin:crawler.scheduleCronHint')} value={scheduleCron} onChange={(e) => setScheduleCron(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('admin:crawler.cancel')}</Button>
          <Button onClick={() => void handleSubmit()} disabled={busy}>
            {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            {t('admin:crawler.create')}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep CrawlJobCreateDialog || echo "no errors"
git add frontend/src/components/admin/CrawlJobCreateDialog.tsx
git commit -m "feat(crawl): CrawlJobCreateDialog 创建 job 弹窗"
```

---

## Task 19: CrawlerPage SSE 替轮询 + 调度信息

**Files:**
- Modify: `frontend/src/pages/admin/CrawlerPage.tsx`

- [ ] **Step 1: 接入 useCrawlStream + 创建弹窗**

在 `CrawlerPage` 组件内加：
```tsx
  const [createOpen, setCreateOpen] = useState(false)
  useCrawlStream({
    onDecision: (d) => { /* 追加到 OrchestratorLogTerminal 的本地日志，或触发 loadOrchMeta */ void loadOrchMeta() },
    onJobStatus: (jobId, status) => {
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status } : j))
      if (status === 'RUNNING' || status === 'PENDING' || status === 'QUEUED') void loadJobs()
    },
    onJobLog: () => { /* 可选：刷新当前选中 job 的日志 */ },
    enabled: pageVisible,
  })
```
（`useCrawlStream` import。`jobs` state 的 setter 需暴露——若现用 `jobs` 变量，加 `setJobs`。）

- [ ] **Step 2: 移除轮询 effect**

删除/简化 `CrawlerPage.tsx:218-228` 的 `setInterval` 轮询 effect（SSE 已实时推送）。保留首次 `refreshAll`。可保留一个低频兜底轮询（如 60s）防 SSE 断线漏消息：
```tsx
  useEffect(() => {
    if (!pageVisible) return
    const timer = window.setInterval(() => { void loadOrchMeta(); void loadJobs() }, 60000)
    return () => window.clearInterval(timer)
  }, [pageVisible, loadOrchMeta, loadJobs])
```

- [ ] **Step 3: job 行显示调度信息 + 创建按钮**

在 `CrawlJobRow`（或 job 列表渲染处）加 priority 徽章 + 重试信息 + schedule：
```tsx
  <span className="text-xs text-muted-foreground">
    {job.priority === 0 ? '🔴' : job.priority === 2 ? '⚪' : ''} {t('admin:crawler.retry', { n: job.retryCount, max: job.maxRetries })}
    {job.scheduleCron ? ` · ⏰${job.scheduleCron}` : ''}
  </span>
```
Jobs 卡顶部加"创建"按钮：
```tsx
  <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1 size-4" />{t('admin:crawler.create')}</Button>
  <CrawlJobCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => void loadJobs()} />
```

- [ ] **Step 4: 429 排队提示**

`startCrawlJob` 调用处，若返回 job status=QUEUED，toast 提示：
```ts
  const r = await startCrawlJob(jobId)
  if (r.status === 'QUEUED') appToast.info(t('admin:crawler.queued'))
```

- [ ] **Step 5: 类型检查 + dev 验证 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep CrawlerPage || echo "no errors"
```
`npm run dev`，CrawlerPage：SSE 连接、创建 job、实时状态。

```bash
git add frontend/src/pages/admin/CrawlerPage.tsx
git commit -m "feat(crawl): CrawlerPage SSE 替轮询 + 调度信息 + 创建按钮"
```

---

## Task 20: i18n + 端到端验证

**Files:**
- Modify: `frontend/src/i18n/locales/zh/admin.json` + `en/admin.json`

- [ ] **Step 1: zh admin.json crawler 组加文案**

```json
"createTitle": "新建爬虫任务",
"create": "创建", "cancel": "取消",
"sourceUrl": "源 URL", "urlRequired": "请输入源 URL",
"priority": "优先级", "priorityHigh": "高", "priorityNormal": "普通", "priorityLow": "低",
"maxRetries": "最大重试", "scheduleCronHint": "定时 cron（可选，如 0 0 * * *）",
"retry": "重试 {{n}}/{{max}}", "queued": "爬虫并发已满，已排队等待",
"createOk": "已创建", "createFail": "创建失败"
```

- [ ] **Step 2: en 对应英文**

```json
"createTitle": "New Crawl Job",
"create": "Create", "cancel": "Cancel",
"sourceUrl": "Source URL", "urlRequired": "Source URL required",
"priority": "Priority", "priorityHigh": "High", "priorityNormal": "Normal", "priorityLow": "Low",
"maxRetries": "Max Retries", "scheduleCronHint": "Schedule cron (optional, e.g. 0 0 * * *)",
"retry": "Retry {{n}}/{{max}}", "queued": "Crawler at capacity, queued",
"createOk": "Created", "createFail": "Create failed"
```

- [ ] **Step 3: 端到端验证**

```bash
cd d:/Users/JZJ/Desktop/agent && powershell -ExecutionPolicy Bypass -File scripts/_restart-dev-stack.ps1
```
设 `CRAWL_ORCHESTRATOR_ENABLED=true`。
1. CrawlerPage SSE 连接（connected 事件）
2. 设 goal → 编排器决策经 SSE 实时推到 OrchestratorLogTerminal
3. 创建 job（带 priority/schedule）→ 状态经 SSE 更新
4. 并发满 → job QUEUED + toast
5. 失败 → 自动重试（retry_count 经 SSE 更新）

- [ ] **Step 4: 全量测试回归 + 提交**

```bash
cd frontend && npx vitest run 2>&1 | tail -8
cd ../python-ai && python -m pytest tests/test_orchestrator_lock.py -q
git add frontend/src/i18n/locales/zh/admin.json frontend/src/i18n/locales/en/admin.json
git commit -m "feat(crawl): i18n + 端到端验证收尾"
```

---

Part 4 完成。模块 6 全部实现完毕。

返回 [主索引](./2026-06-19-crawler.md)。
