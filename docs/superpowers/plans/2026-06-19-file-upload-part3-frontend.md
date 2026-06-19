# Part 3 — 前端实现计划

> 主索引：[2026-06-19-file-upload.md](./2026-06-19-file-upload.md)
> 设计：[spec part2 §6](../specs/2026-06-19-file-upload-design-part2.md)
> **依赖 Part1/Part2 完成**（后端端点可用）。

**约定**：`secureFetch` + `parseResultResponse`；FormData body 由 fetch 自动设 Content-Type（勿手设）；轮询用 `usePageVisible` + `setInterval`（参考 `CrawlerPage.tsx:218-228`）；i18n key 走 `dashboard:myLibrary.*`。前端测试 `cd frontend && npx vitest run`；类型 `npx tsc --noEmit`。

---

## Task 23: types/file.ts + uploadApi.ts

**Files:**
- Create: `frontend/src/types/file.ts`
- Create: `frontend/src/api/uploadApi.ts`

- [ ] **Step 1: 写 types/file.ts**

```ts
export type UploadStatus = 'pending' | 'parsing' | 'ready' | 'failed'

export interface UploadedFile {
  fileId: string
  status: UploadStatus
  progress: number | null
  originalName: string
  sizeBytes: number
  format: string
  parseError?: string | null
  catalogNovelId?: string | null
  createdAt: number
}

export interface UploadQuota {
  limit: number | string // number 或 'unlimited'
  used: number
  remaining: number | string
}
```

- [ ] **Step 2: 写 uploadApi.ts**

```ts
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'
import type { CatalogNovel, CatalogNovelPage } from './catalogApi'
import type { UploadedFile, UploadQuota } from '../types/file'

const BASE = '/api/content/auth/upload'

export async function uploadFile(file: File, title?: string): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  if (title) form.append('title', title)
  const res = await secureFetch(`${BASE}/file`, { method: 'POST', body: form })
  if (!res.ok) {
    const msg = res.status === 409 ? '上传数量已达套餐上限' : '上传失败'
    throw new Error(msg)
  }
  return parseResultResponse<UploadedFile>(res)
}

export async function listUploadedFiles(pageCurrent = 1, pageSize = 50): Promise<{ list: UploadedFile[]; total: number }> {
  const res = await secureFetch(`${BASE}/files?pageCurrent=${pageCurrent}&pageSize=${pageSize}`)
  if (!res.ok) throw new Error('加载上传列表失败')
  const page = await parseResultResponse<{ list: UploadedFile[]; total: number; pageCurrent: number; pageSize: number }>(res)
  return { list: page.list, total: page.total }
}

export async function getUploadedFile(fileId: string): Promise<UploadedFile> {
  const res = await secureFetch(`${BASE}/files/${fileId}`)
  if (!res.ok) throw new Error('查询文件状态失败')
  return parseResultResponse<UploadedFile>(res)
}

export async function deleteUploadedFile(fileId: string): Promise<void> {
  const res = await secureFetch(`${BASE}/files/${fileId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}

export async function retryParse(fileId: string): Promise<UploadedFile> {
  const res = await secureFetch(`${BASE}/files/${fileId}/retry`, { method: 'POST' })
  if (!res.ok) throw new Error('重试失败')
  return parseResultResponse<UploadedFile>(res)
}

export async function getUploadQuota(): Promise<UploadQuota> {
  const res = await secureFetch(`${BASE}/quota`)
  if (!res.ok) throw new Error('加载配额失败')
  return parseResultResponse<UploadQuota>(res)
}

// 公共书库 → 收藏到我的书库（轻引用）
export async function collectToMyLibrary(catalogNovelId: string): Promise<void> {
  const res = await secureFetch(`/api/content/auth/catalog/novels/${catalogNovelId}/collect`, { method: 'POST' })
  if (!res.ok) throw new Error('收藏失败')
}

// 我的书库列表（收藏 + 自己上传）
export async function fetchMyLibrary(pageCurrent = 1, pageSize = 50): Promise<CatalogNovelPage> {
  const res = await secureFetch(`/api/content/auth/catalog/my-library?pageCurrent=${pageCurrent}&pageSize=${pageSize}`)
  if (!res.ok) throw new Error('加载我的书库失败')
  return parseResultResponse<CatalogNovelPage>(res)
}
```
（确认 `CatalogNovelPage` 已在 `catalogApi.ts` 导出——探索报告显示 `catalogApi.ts:26-31` 有该类型。若字段名不符按实际调整。）

- [ ] **Step 3: 类型检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "file.ts|uploadApi.ts" || echo "no new errors"
```
（忽略既有的不相关报错。）

- [ ] **Step 4: 提交**

```bash
git add frontend/src/types/file.ts frontend/src/api/uploadApi.ts
git commit -m "feat(my-library): UploadedFile 类型 + uploadApi（上传/查询/删除/配额/收藏）"
```

---

## Task 24: useUploadProgress hook

**Files:**
- Create: `frontend/src/hooks/useUploadProgress.ts`

- [ ] **Step 1: 写 hook**

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { getUploadedFile } from '@/api/uploadApi'
import { usePageVisible } from './usePageVisible'
import type { UploadedFile } from '@/types/file'

/** 轮询单个文件解析状态/进度，直到 ready/failed 或页面不可见。 */
export function useUploadProgress(file: UploadedFile | null, onDone?: (f: UploadedFile) => void) {
  const [current, setCurrent] = useState<UploadedFile | null>(file)
  const pageVisible = usePageVisible()
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => { setCurrent(file) }, [file])

  const polling = current !== null && (current.status === 'pending' || current.status === 'parsing')

  useEffect(() => {
    if (!polling || !pageVisible || !current) return
    const timer = window.setInterval(async () => {
      try {
        const next = await getUploadedFile(current.fileId)
        setCurrent(next)
        if (next.status === 'ready' || next.status === 'failed') {
          onDoneRef.current?.(next)
        }
      } catch {
        // 静默重试
      }
    }, 2000)
    return () => window.clearInterval(timer)
  }, [polling, pageVisible, current])

  return current
}
```
（`usePageVisible` 路径确认：`src/hooks/usePageVisible.ts`，导出 `usePageVisible`。）

- [ ] **Step 2: 类型检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep useUploadProgress || echo "no errors"
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/hooks/useUploadProgress.ts
git commit -m "feat(my-library): useUploadProgress 轮询 hook（2s，页面可见时）"
```

---

## Task 25: FileUploader 组件

**Files:**
- Create: `frontend/src/components/ui/FileUploader.tsx`

> 上传中显示 XHR 进度，上传后显示解析状态/进度条（用 `useUploadProgress`）。

- [ ] **Step 1: 写组件**

```tsx
import { useRef, useState } from 'react'
import { Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from './button'
import { appToast } from '@/stores/appToastStore'
import { uploadFile, retryParse } from '@/api/uploadApi'
import { useUploadProgress } from '@/hooks/useUploadProgress'
import { useTranslation } from 'react-i18next'
import type { UploadedFile } from '@/types/file'

interface FileUploaderProps {
  onUploaded: (f: UploadedFile) => void
  onResolved: (f: UploadedFile) => void
}

export function FileUploader({ onUploaded, onResolved }: FileUploaderProps) {
  const { t } = useTranslation(['dashboard'])
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [last, setLast] = useState<UploadedFile | null>(null)
  const tracked = useUploadProgress(last, onResolved)

  const handlePick = () => inputRef.current?.click()

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setUploadPct(0)
    try {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setUploadPct(Math.round((ev.loaded / ev.total) * 100))
      }
      await new Promise<void>((resolve, reject) => {
        xhr.open('POST', '/api/content/auth/upload/file')
        xhr.withCredentials = true
        xhr.onload = () => resolve()
        xhr.onerror = () => reject(new Error('上传失败'))
        const form = new FormData()
        form.append('file', file)
        // secureFetch 不便拿 upload progress，这里用裸 xhr；auth 头由 cookie 携带（credentials:include）
        // 注意：若启用请求加密/签名，需复用 secureFetch 的签名逻辑。当前上传走 FormData 不加密，此处可接受。
        xhr.send(form)
      })
      // xhr 完成后用 secureFetch 拿结果（确保鉴权一致）
      const result = await uploadFile(file)
      setLast(result)
      onUploaded(result)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('myLibrary.uploadFail'))
    } finally {
      setUploading(false)
    }
  }

  const handleRetry = async () => {
    if (!last) return
    try {
      const r = await retryParse(last.fileId)
      setLast(r)
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '重试失败')
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.markdown,.epub,.pdf,.docx"
        className="hidden"
        onChange={(e) => void handleChange(e)}
      />
      {uploading ? (
        <div>
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
          <div className="mt-2 h-1.5 w-full max-w-xs mx-auto overflow-hidden rounded bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${uploadPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{uploadPct}%</p>
        </div>
      ) : (
        <Button variant="outline" onClick={handlePick}>
          <Upload className="mr-2 size-4" />
          {t('myLibrary.uploadButton')}
        </Button>
      )}

      {tracked && tracked.status !== 'ready' && !uploading ? (
        <div className="mt-4 text-sm">
          {tracked.status === 'parsing' && (
            <>
              <Loader2 className="mr-1 inline size-4 animate-spin" />
              {t('myLibrary.parsing', { progress: tracked.progress ?? 0 })}
              <div className="mt-1 h-1.5 w-full max-w-xs mx-auto overflow-hidden rounded bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${tracked.progress ?? 0}%` }} />
              </div>
            </>
          )}
          {tracked.status === 'pending' && <span className="text-muted-foreground">{t('myLibrary.pending')}</span>}
          {tracked.status === 'failed' && (
            <div className="text-destructive">
              <XCircle className="mr-1 inline size-4" />
              {tracked.parseError || t('myLibrary.parseFail')}
              <Button variant="link" size="sm" onClick={() => void handleRetry()}>{t('myLibrary.retry')}</Button>
            </div>
          )}
        </div>
      ) : null}

      {tracked && tracked.status === 'ready' ? (
        <div className="mt-4 text-sm text-emerald-600">
          <CheckCircle2 className="mr-1 inline size-4" />
          {t('myLibrary.parseDone')}
        </div>
      ) : null}
    </div>
  )
}
```
（核实 `appToast` 导出路径 `@/stores/appToastStore`、Button variant/sized 与 `button.tsx` 一致。`useTranslation(['dashboard'])` 用 `myLibrary.*` 命名空间——Task 28 加文案。）

- [ ] **Step 2: 类型检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep FileUploader || echo "no errors"
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/ui/FileUploader.tsx
git commit -m "feat(my-library): FileUploader 组件（XHR 进度 + 解析轮询进度条）"
```

---

## Task 26: MyLibraryPage 页面

**Files:**
- Create: `frontend/src/pages/dashboard/MyLibraryPage.tsx`

> 复用 `BookstorePage` 卡片布局；顶部 FileUploader + 配额；列表 = `fetchMyLibrary`（收藏+上传）。

- [ ] **Step 1: 写页面**

```tsx
import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Plus, RefreshCw } from 'lucide-react'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileUploader } from '@/components/ui/FileUploader'
import { appToast } from '@/stores/appToastStore'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { useTranslation } from 'react-i18next'
import { fetchMyLibrary, getUploadQuota } from '@/api/uploadApi'
import type { CatalogNovel } from '@/api/catalogApi'
import type { UploadQuota } from '@/types/file'

export default function MyLibraryPage() {
  const { t } = useTranslation(['dashboard'])
  useMarkRouteSeen()
  const [novels, setNovels] = useState<CatalogNovel[] | null>(null)
  const [quota, setQuota] = useState<UploadQuota | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [page, q] = await Promise.all([fetchMyLibrary(1, 50), getUploadQuota()])
      setNovels(page.list)
      setQuota(q)
    } catch (err) {
      setNovels([])
      appToast.error(err instanceof Error ? err.message : t('myLibrary.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void load() }, [load])

  const quotaText = quota
    ? quota.limit === 'unlimited'
      ? t('myLibrary.quotaUnlimited', { used: quota.used })
      : t('myLibrary.quota', { used: quota.used, limit: quota.limit })
    : ''

  return (
    <AppPageStack>
      <AppPageIntro title={t('myLibrary.title')} description={t('myLibrary.description')} />
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{quotaText}</span>
        <Button variant="ghost" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-1 size-4" /> {t('myLibrary.refresh')}
        </Button>
      </div>

      <FileUploader
        onUploaded={() => { /* 列表稍后轮询到 ready 再刷新 */ }}
        onResolved={() => void load()}
      />

      {novels === null || loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : novels.length === 0 ? (
        <AppEmptyState title={t('myLibrary.empty')} icon={<BookOpen className="size-6" />} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {novels.map((novel) => (
            <article key={novel.id} className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <h3 className="line-clamp-2 text-lg font-bold text-foreground">{novel.title}</h3>
              {novel.author ? <p className="mt-1 text-sm text-muted-foreground">{novel.author}</p> : null}
              <p className="mt-auto pt-3 text-xs text-muted-foreground">
                {t('myLibrary.chapterCount', { count: novel.chapterCount })}
              </p>
              <Button className="mt-3" size="sm" onClick={() => void load()}>
                <Plus className="mr-1 size-4" /> {t('myLibrary.addToNovel')}
              </Button>
            </article>
          ))}
        </div>
      )}
    </AppPageStack>
  )
}
```
（`AppPageIntro`/`AppEmptyState`/`AppPageStack` 从 `@/components/layout/AppPageStack` 导入——按 `BookstorePage` 一致。`addToNovel` 按钮目前只刷新，实际"添加到我的小说"复用 `addCatalogToLibrary`，可后续接入——此处占位。）

- [ ] **Step 2: 类型检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep MyLibraryPage || echo "no errors"
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/pages/dashboard/MyLibraryPage.tsx
git commit -m "feat(my-library): MyLibraryPage（配额+上传+列表）"
```

---

## Task 27: BookstorePage 收藏按钮

**Files:**
- Modify: `frontend/src/pages/dashboard/BookstorePage.tsx`

- [ ] **Step 1: 加收藏 import + handler + 按钮**

在 `BookstorePage.tsx` import 区加：
```tsx
import { collectToMyLibrary } from '@/api/uploadApi'
```
在组件内（`handleAdd` 附近）加 handler：
```tsx
const [collectingId, setCollectingId] = useState<string | null>(null)
const handleCollect = async (catalogNovelId: string) => {
  setCollectingId(catalogNovelId)
  try {
    await collectToMyLibrary(catalogNovelId)
    appToast.success(t('dashboard:bookstore.collectSuccess'))
  } catch (err) {
    appToast.error(err instanceof Error ? err.message : t('dashboard:bookstore.collectFail'))
  } finally {
    setCollectingId(null)
  }
}
```
在卡片底部"addToLibrary"按钮旁加收藏按钮：
```tsx
<Button
  variant="outline"
  className={APP_BTN_FULL_MD}
  disabled={collectingId === novel.id}
  onClick={() => void handleCollect(novel.id)}
>
  {collectingId === novel.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <BookMarked className="mr-2 size-4" />}
  {t('dashboard:bookstore.collectToMyLibrary')}
</Button>
```
（`Loader2`/`BookMarked` 已在文件 import；`APP_BTN_FULL_MD` 已用。）

- [ ] **Step 2: 类型检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep BookstorePage || echo "no errors"
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/pages/dashboard/BookstorePage.tsx
git commit -m "feat(my-library): BookstorePage 加'收藏到我的书库'按钮"
```

---

## Task 28: 路由 + 导航 + PAGE_META + i18n

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/dashboard/AppSidebar.tsx`
- Modify: `frontend/src/layouts/DashboardLayout.tsx`
- Modify: `frontend/src/i18n/locales/zh/dashboard.json`
- Modify: `frontend/src/i18n/locales/en/dashboard.json`
- Modify: `frontend/src/i18n/locales/zh/common.json`
- Modify: `frontend/src/i18n/locales/en/common.json`

- [ ] **Step 1: App.tsx 加 lazy import + Route**

在 `App.tsx` lazy import 区（`BookstorePage` 行附近）加：
```tsx
const MyLibraryPage = lazy(() => import('./pages/dashboard/MyLibraryPage'))
```
在 `<Route path="bookstore" .../>` 后加：
```tsx
<Route path="my-library" element={<MyLibraryPage />} />
```

- [ ] **Step 2: AppSidebar.tsx 加导航项**

在 `AppSidebar.tsx` import 区加 `Library` 图标（`from 'lucide-react'`）。
在 `mainNav` 数组的 `dashboardBookstore` 项后加：
```tsx
{ label: t('common:nav.dashboardMyLibrary'), to: '/dashboard/my-library', icon: Library },
```

- [ ] **Step 3: DashboardLayout.tsx 加 PAGE_META**

在 `PAGE_META` map 加：
```tsx
'/dashboard/my-library': { title: t('layout.dashboard.myLibraryTitle'), description: t('layout.dashboard.myLibraryDesc') },
```
（若 `PAGE_META` 不用 t 而是静态字符串，则写 `{ title: '我的书库', description: '管理上传与收藏的参考书目' }`——按现有 `bookstore` 条目写法对齐。）

- [ ] **Step 4: zh/common.json 加文案**

在 `nav` 对象加：
```json
"dashboardMyLibrary": "我的书库"
```
在 `layout.dashboard` 对象加：
```json
"myLibraryTitle": "我的书库",
"myLibraryDesc": "管理上传与收藏的参考书目"
```

- [ ] **Step 5: en/common.json 加对应英文**

```json
"dashboardMyLibrary": "My Library"
```
```json
"myLibraryTitle": "My Library",
"myLibraryDesc": "Manage your uploaded and collected reference books"
```

- [ ] **Step 6: zh/dashboard.json 加 myLibrary 组**

在 dashboard.json 顶层加：
```json
"myLibrary": {
  "title": "我的书库",
  "description": "管理上传与收藏的参考书目",
  "uploadButton": "上传文件",
  "uploadFail": "上传失败",
  "parsing": "解析中 {{progress}}%",
  "pending": "等待解析",
  "parseFail": "解析失败",
  "parseDone": "解析完成",
  "retry": "重试",
  "quota": "已用 {{used}} / {{limit}}",
  "quotaUnlimited": "已用 {{used}}（无限）",
  "refresh": "刷新",
  "empty": "还没有书目，上传或从书库收藏吧",
  "chapterCount": "{{count}} 章",
  "addToNovel": "添加到我的小说",
  "loadFail": "加载失败",
  "collectSuccess": "已收藏到我的书库",
  "collectFail": "收藏失败"
}
```

- [ ] **Step 7: en/dashboard.json 加对应英文**

```json
"myLibrary": {
  "title": "My Library",
  "description": "Manage your uploaded and collected reference books",
  "uploadButton": "Upload File",
  "uploadFail": "Upload failed",
  "parsing": "Parsing {{progress}}%",
  "pending": "Waiting to parse",
  "parseFail": "Parse failed",
  "parseDone": "Parse complete",
  "retry": "Retry",
  "quota": "Used {{used}} / {{limit}}",
  "quotaUnlimited": "Used {{used}} (unlimited)",
  "refresh": "Refresh",
  "empty": "No books yet — upload or collect from the bookstore",
  "chapterCount": "{{count}} chapters",
  "addToNovel": "Add to my novel",
  "loadFail": "Load failed",
  "collectSuccess": "Collected to my library",
  "collectFail": "Collect failed"
}
```

也在 bookstore 组加 `collectToMyLibrary`/`collectSuccess`/`collectFail`（zh + en）。

- [ ] **Step 8: 类型检查 + dev 验证**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "App.tsx|AppSidebar|DashboardLayout|dashboard.json" || echo "no errors"
```
`cd frontend && npm run dev`，访问 http://127.0.0.1:3000/dashboard/my-library，确认页面渲染、侧栏项、配额显示。

- [ ] **Step 9: 提交**

```bash
git add frontend/src/App.tsx frontend/src/components/dashboard/AppSidebar.tsx frontend/src/layouts/DashboardLayout.tsx \
        frontend/src/i18n/locales/zh/dashboard.json frontend/src/i18n/locales/en/dashboard.json \
        frontend/src/i18n/locales/zh/common.json frontend/src/i18n/locales/en/common.json
git commit -m "feat(my-library): 路由+导航+PAGE_META+i18n"
```

---

## Task 29（收尾）: 端到端验证

- [ ] **Step 1: 全栈重启**

```bash
cd d:/Users/JZJ/Desktop/agent && powershell -ExecutionPolicy Bypass -File scripts/_restart-dev-stack.ps1
```
确认三服务健康（:8080/:8000/:3000）。

- [ ] **Step 2: 端到端流程**

浏览器 http://127.0.0.1:3000/dashboard/my-library：
1. 上传一个 txt 文件 → 进度条 → 待解析 → 轮询 → 已就绪
2. 列表出现该书目（source=upload）
3. 去 /dashboard/bookstore → 收藏一本书 → 回 my-library 列表出现
4. 配额显示 `已用 N / M`

- [ ] **Step 3: 失败路径**

上传一个扫描型 pdf → 解析失败 → 显示 `pdf_scan_unsupported` + 重试按钮。

- [ ] **Step 4: 管理员上传**

用管理员账号（JWT 含 admin 角色）调 `POST /api/content/crm/upload/file` → 公共书库出现。非 admin 调 → 403。

- [ ] **Step 5: 全量测试回归**

```bash
cd frontend && npx vitest run 2>&1 | tail -10
cd ../python-ai && python -m pytest tests/test_parse_*.py -q
```

- [ ] **Step 6: 最终提交（若有遗留）**

```bash
git status
# 若有未提交：
git add -A && git commit -m "feat(upload): 端到端验证收尾"
```

---

Part 3 完成。模块 5 全部实现完毕。

返回 [主索引](./2026-06-19-file-upload.md)。
