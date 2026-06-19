# Part 5 — 前端实现计划

> 主索引：[2026-06-19-model-config.md](./2026-06-19-model-config.md) ｜ [Part 4](./2026-06-19-model-config-part4-python-loop.md)
> 设计：[册3 §6](../specs/2026-06-19-model-config-design-part3.md)
> 约定：`secureFetch` + `parseResultResponse`；admin 路由 `RequireAdmin` 包裹（App.tsx:99-117）；admin API 模式 `secureFetch('/api/.../crm/...')`。前端测试 `cd frontend && npx vitest run`；`npx tsc --noEmit`。

---

## Task 24: types/model.ts + modelApi.ts

**Files:**
- Create: `frontend/src/types/model.ts`
- Create: `frontend/src/api/modelApi.ts`

- [ ] **Step 1: 写 types/model.ts**

```ts
export type ModelType = 'llm' | 'embedding' | 'crawl' | 'image'

export interface AiModel {
  id: string
  code: string
  displayName: string
  modelType: ModelType
  provider: string
  protocol: string
  modelName: string
  baseUrl: string
  apiKeyMasked: string
  maxTokens?: number | null
  temperature?: number | null
  inputPricePer1kMicros?: number | null
  outputPricePer1kMicros?: number | null
  priceMultiplier: number
  active: boolean
  isDefault: boolean
  sortOrder: number
  description?: string | null
  planCodes: string[]
}

export interface UserModel {
  id: string
  modelType: ModelType
  publicModelId?: string | null
  publicModel?: AiModel | null
  label?: string | null
  provider?: string | null
  protocol?: string | null
  modelName?: string | null
  baseUrl?: string | null
  byok: boolean
  isDefault: boolean
}

export interface AvailableModels {
  publicModels: AiModel[]
  byok: UserModel[]
}

export interface ByokUpsertReq {
  label: string
  modelType?: ModelType
  provider: string
  protocol: string
  modelName: string
  baseUrl: string
  apiKey?: string
}
```

- [ ] **Step 2: 写 modelApi.ts**

```ts
import { secureFetch } from '../security/secureFetch'
import { parseResultResponse } from '../utils/resultApi'
import type { AiModel, AvailableModels, ByokUpsertReq, UserModel } from '../types/model'

// ===== CRM 管理员 =====
const CRM = '/api/content/crm/model'

export async function adminListModels(type?: string): Promise<AiModel[]> {
  const res = await secureFetch(`${CRM}?type=${type ?? ''}`)
  if (!res.ok) throw new Error(res.status === 403 ? '无管理权限' : '加载模型失败')
  return parseResultResponse<AiModel[]>(res)
}

export async function adminCreateModel(req: Partial<AiModel> & { apiKey: string }): Promise<AiModel> {
  const res = await secureFetch(CRM, { method: 'POST', body: JSON.stringify(req) })
  if (!res.ok) throw new Error('创建失败')
  return parseResultResponse<AiModel>(res)
}

export async function adminUpdateModel(id: string, req: Partial<AiModel> & { apiKey?: string }): Promise<AiModel> {
  const res = await secureFetch(`${CRM}/${id}`, { method: 'PUT', body: JSON.stringify(req) })
  if (!res.ok) throw new Error('更新失败')
  return parseResultResponse<AiModel>(res)
}

export async function adminDeleteModel(id: string): Promise<void> {
  const res = await secureFetch(`${CRM}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}

export async function adminSetPlans(id: string, planCodes: string[]): Promise<void> {
  const res = await secureFetch(`${CRM}/${id}/plans`, { method: 'PUT', body: JSON.stringify({ planCodes }) })
  if (!res.ok) throw new Error('设置套餐失败')
}

export async function adminSetDefault(id: string): Promise<void> {
  const res = await secureFetch(`${CRM}/${id}/default`, { method: 'POST' })
  if (!res.ok) throw new Error('设默认失败')
}

export async function adminTestModel(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await secureFetch(`${CRM}/${id}/test`, { method: 'POST' })
  if (!res.ok) throw new Error('测试失败')
  return parseResultResponse<{ ok: boolean; error?: string }>(res)
}

// ===== 用户 =====
const AUTH = '/api/content/auth/model'

export async function fetchAvailableModels(type = 'llm'): Promise<AvailableModels> {
  const res = await secureFetch(`${AUTH}/available?type=${type}`)
  if (!res.ok) throw new Error('加载可用模型失败')
  return parseResultResponse<AvailableModels>(res)
}

export async function fetchDefaultModel(type = 'llm'): Promise<UserModel | null> {
  const res = await secureFetch(`${AUTH}/default?type=${type}`)
  if (!res.ok) throw new Error('加载默认模型失败')
  return parseResultResponse<UserModel | null>(res)
}

export async function setDefaultModel(type: string, userModelId: string): Promise<void> {
  const res = await secureFetch(`${AUTH}/default`, { method: 'PUT', body: JSON.stringify({ type, userModelId }) })
  if (!res.ok) throw new Error('设置默认失败')
}

export async function createByok(req: ByokUpsertReq): Promise<UserModel> {
  const res = await secureFetch(`${AUTH}/byok`, { method: 'POST', body: JSON.stringify(req) })
  if (!res.ok) throw new Error('创建私有模型失败')
  return parseResultResponse<UserModel>(res)
}

export async function updateByok(id: string, req: ByokUpsertReq): Promise<UserModel> {
  const res = await secureFetch(`${AUTH}/byok/${id}`, { method: 'PUT', body: JSON.stringify(req) })
  if (!res.ok) throw new Error('更新私有模型失败')
  return parseResultResponse<UserModel>(res)
}

export async function deleteByok(id: string): Promise<void> {
  const res = await secureFetch(`${AUTH}/byok/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除私有模型失败')
}
```

- [ ] **Step 3: 类型检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "types/model.ts|modelApi.ts" || echo "no new errors"
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/types/model.ts frontend/src/api/modelApi.ts
git commit -m "feat(model): 类型 + modelApi(CRM+auth)"
```

---

## Task 25: AdminModelsPage

**Files:**
- Create: `frontend/src/pages/admin/AdminModelsPage.tsx`

> 按 type 分 tab，列表 + 新建/编辑弹窗 + 套餐关联 + 设默认 + 测试连通。简化首版：列表 + 内联新建表单 + 操作按钮。

- [ ] **Step 1: 写页面**

```tsx
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Star, Trash2, Zap } from 'lucide-react'
import { AppEmptyState, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { appToast } from '@/stores/appToastStore'
import { useTranslation } from 'react-i18next'
import {
  adminCreateModel, adminDeleteModel, adminListModels,
  adminSetDefault, adminTestModel, adminUpdateModel,
} from '@/api/modelApi'
import type { AiModel, ModelType } from '@/types/model'

const TYPES: ModelType[] = ['llm', 'embedding', 'crawl', 'image']
const PLANS = ['hobby', 'pro', 'enterprise']

export default function AdminModelsPage() {
  const { t } = useTranslation(['admin'])
  const [type, setType] = useState<ModelType>('llm')
  const [models, setModels] = useState<AiModel[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setModels(await adminListModels(type)) }
    catch (e) { setModels([]); appToast.error(e instanceof Error ? e.message : '加载失败') }
  }, [type])

  useEffect(() => { void load() }, [load])

  const handleSetDefault = async (id: string) => {
    setBusy(id)
    try { await adminSetDefault(id); await load(); appToast.success('已设为默认') }
    catch (e) { appToast.error(e instanceof Error ? e.message : '失败') }
    finally { setBusy(null) }
  }
  const handleTest = async (id: string) => {
    setBusy(id)
    try {
      const r = await adminTestModel(id)
      r.ok ? appToast.success('连通正常') : appToast.error(r.error || '连通失败')
    } catch (e) { appToast.error(e instanceof Error ? e.message : '测试失败') }
    finally { setBusy(null) }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('删除该模型？')) return
    setBusy(id)
    try { await adminDeleteModel(id); await load() } catch (e) { appToast.error('删除失败') }
    finally { setBusy(null) }
  }

  return (
    <AppPageStack>
      <AppPageIntro title={t('model.title')} description={t('model.description')} />
      <div className="flex gap-2">
        {TYPES.map((ty) => (
          <Button key={ty} variant={type === ty ? 'default' : 'outline'} size="sm" onClick={() => setType(ty)}>
            {t(`model.types.${ty}`)}
          </Button>
        ))}
      </div>
      {models === null ? (
        <Loader2 className="size-6 animate-spin" />
      ) : models.length === 0 ? (
        <AppEmptyState title={t('model.empty')} icon={<Plus className="size-6" />} />
      ) : (
        <div className="space-y-2">
          {models.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.displayName}</span>
                  {m.isDefault ? <Star className="size-4 fill-amber-400 text-amber-400" /> : null}
                  <span className="text-xs text-muted-foreground">×{m.priceMultiplier}</span>
                  <span className="text-xs text-muted-foreground">{m.provider}/{m.modelName}</span>
                </div>
                <div className="text-xs text-muted-foreground">{m.apiKeyMasked}</div>
                <div className="text-xs text-muted-foreground">套餐: {m.planCodes.join(', ') || '无'}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={busy === m.id} onClick={() => void handleTest(m.id)}>
                  <Zap className="mr-1 size-4" />{t('model.test')}
                </Button>
                {!m.isDefault ? (
                  <Button size="sm" variant="outline" disabled={busy === m.id} onClick={() => void handleSetDefault(m.id)}>
                    <Star className="mr-1 size-4" />{t('model.setDefault')}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" disabled={busy === m.id} onClick={() => void handleDelete(m.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 新建/编辑弹窗首版省略，用单独 ModelEditDialog 组件后续补；此处仅列表管理 */}
    </AppPageStack>
  )
}
```
（`ModelEditDialog` 新建/编辑弹窗——含表单字段 + 套餐多选，作为独立任务/组件补；首版可先内联一个简单新建表单。i18n key 走 `admin:model.*`，Task 29 加文案。）

- [ ] **Step 2: 类型检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep AdminModelsPage || echo "no errors"
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/pages/admin/AdminModelsPage.tsx
git commit -m "feat(model): AdminModelsPage 列表+设默认+测试+删除"
```

---

## Task 26: ModelSelector 组件

**Files:**
- Create: `frontend/src/components/model/ModelSelector.tsx`

> 复用：设置页(默认) + 聊天区(临时切换)。下拉项 = 公共(按套餐可用) + BYOK。选中变化回调。

- [ ] **Step 1: 写组件**

```tsx
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchAvailableModels } from '@/api/modelApi'
import type { AvailableModels } from '@/types/model'
import { useTranslation } from 'react-i18next'

interface Props {
  value?: string | null        // userModelId
  onChange: (userModelId: string | null) => void
  type?: string
}

export function ModelSelector({ value, onChange, type = 'llm' }: Props) {
  const { t } = useTranslation(['dashboard'])
  const [data, setData] = useState<AvailableModels | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchAvailableModels(type)
      .then(setData)
      .catch(() => setData({ publicModels: [], byok: [] }))
      .finally(() => setLoading(false))
  }, [type])

  if (loading) return <Loader2 className="size-4 animate-spin" />

  return (
    <select
      className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{t('model.platformDefault')}</option>
      <optgroup label={t('model.public')}>
        {data?.publicModels.map((m) => (
          <option key={m.id} value={`pub:${m.id}`}>
            {m.displayName} (×{m.priceMultiplier})
          </option>
        ))}
      </optgroup>
      <optgroup label={t('model.byok')}>
        {data?.byok.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label || m.modelName} ({t('model.byokBadge')})
          </option>
        ))}
      </optgroup>
    </select>
  )
}
```
（value 约定：`pub:<modelId>` = 临时选公共模型（Java 侧需支持 publicModelId 透传——`AgentModelResolver.resolve` override 当前只接 userModelId；**补**：override 形如 `pub:<id>` 时 resolver 直接按 publicModelId 查 ai_model。回 Part2 Task12 resolve override 分支加：若 override 以 `pub:` 开头，取 aiModel by id，返回 fromAiModel(m,"public")。若 value=普通 userModelId 走 BYOK/默认引用。）

- [ ] **Step 2: AgentModelResolver 支持 pub: 前缀（Part2 Task12 补）**

`resolve` override 分支加：
```java
        if (overrideUserModelId.startsWith("pub:")) {
            String publicModelId = overrideUserModelId.substring(4);
            AiModelEntity m = aiRepo.findById(publicModelId).orElseThrow(() -> new IllegalArgumentException("模型不存在"));
            return fromAiModel(m, "public");
        }
```

- [ ] **Step 3: 类型检查 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep ModelSelector || echo "no errors"
git add frontend/src/components/model/ModelSelector.tsx \
        novel-studio/studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent/service/AgentModelResolver.java
git commit -m "feat(model): ModelSelector 组件 + resolver 支持 pub: 临时公共模型"
```

---

## Task 27: SettingsPage 默认模型 + BYOK

**Files:**
- Modify: `frontend/src/pages/dashboard/SettingsPage.tsx`

> Account 与 Feedback 卡之间加"默认模型"卡：ModelSelector + BYOK 列表 + 新建/删除。

- [ ] **Step 1: SettingsPage 加默认模型卡**

在 Account 卡后加（用 `AppShellCard` 原语）：
```tsx
        <AppShellCard>
          <AppShellCardHeader title={t('dashboard:model.defaultTitle')} description={t('dashboard:model.defaultDesc')} />
          <AppShellCardBody>
            <ModelSelector value={defaultId} onChange={handleSetDefault} />
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">{t('dashboard:model.byokTitle')}</div>
              {byok.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-1 text-sm">
                  <span>{m.label || m.modelName} <span className="text-xs text-muted-foreground">({t('dashboard:model.byokBadge')})</span></span>
                  <Button size="sm" variant="ghost" onClick={() => void handleDeleteByok(m.id)}><Trash2 className="size-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setByokOpen(true)}><Plus className="mr-1 size-4" />{t('dashboard:model.addByok')}</Button>
            </div>
          </AppShellCardBody>
        </AppShellCard>
```
（import `ModelSelector`、`fetchDefaultModel`、`setDefaultModel`、`fetchAvailableModels`、`createByok`、`deleteByok`、`Plus`/`Trash2`。state `defaultId`/`byok`/`byokOpen`。`handleSetDefault` 调 `setDefaultModel('llm', id)`；BYOK 新建弹窗 `byokOpen` 用 Dialog 含表单。）

- [ ] **Step 2: 类型检查 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep SettingsPage || echo "no errors"
git add frontend/src/pages/dashboard/SettingsPage.tsx
git commit -m "feat(model): SettingsPage 默认模型 + BYOK 管理"
```

---

## Task 28: 聊天区临时切换

**Files:**
- Modify: 聊天消息发送组件（找 `EditorChatPanel.tsx` 或 Composer，加 ModelSelector + 把 modelOverride 传入发送请求）

> 发消息时带 `modelOverride`（userModelId 或 `pub:<id>`）到后端 RunRequest。

- [ ] **Step 1: 找发送入口**

grep `modelOverride` 前端发送处——`AgentStreamRequest` 后端加了 `modelOverride` 字段，前端发消息 body 带上。找 `EditorChatPanel` 发送函数。

- [ ] **Step 2: 聊天顶部加 ModelSelector + 传 override**

在聊天输入区上方加：
```tsx
<div className="flex items-center gap-2 px-2 py-1">
  <span className="text-xs text-muted-foreground">{t('editor:chat.model')}</span>
  <ModelSelector value={override} onChange={setOverride} />
</div>
```
发送时 body 加 `modelOverride: override || undefined`。

- [ ] **Step 3: 类型检查 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "Chat|Composer" || echo "no errors"
git add frontend/src/components/editor/
git commit -m "feat(model): 聊天区临时切换模型下拉"
```

---

## Task 29: 路由 + 导航 + i18n

**Files:**
- Modify: `frontend/src/App.tsx`（admin 路由 + lazy）
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`（导航项）
- Modify: `frontend/src/layouts/AdminLayout.tsx`（PAGE_META）
- Modify: `src/i18n/locales/zh/admin.json` + `en/admin.json`（model.* 文案）
- Modify: `src/i18n/locales/zh/dashboard.json` + `en/dashboard.json`（model.* 文案）
- Modify: `src/i18n/locales/zh/common.json` + `en/common.json`（nav.adminModels）

- [ ] **Step 1: App.tsx admin 路由**

lazy import + `<Route path="models" element={<AdminModelsPage />} />`（加在 crawler 前）。

- [ ] **Step 2: AdminSidebar 导航项**

`{ label: t('common:nav.adminModels'), to: '/admin/models', icon: Cpu }`（`Cpu` from lucide-react，加在 plans 后）。

- [ ] **Step 3: AdminLayout PAGE_META**

`'/admin/models': { title: '模型管理', description: '配置 AI 模型与 API Key' }`。

- [ ] **Step 4: i18n zh 文案**

`common.json` nav: `"adminModels": "模型管理"`。
`admin.json` 加 `model` 组：
```json
"model": {
  "title": "模型管理", "description": "配置 AI 模型、API Key、价格与套餐",
  "empty": "暂无模型，点击新建",
  "test": "测试", "setDefault": "设默认",
  "types": { "llm": "LLM", "embedding": "Embedding", "crawl": "爬虫", "image": "图像" }
}
```
`dashboard.json` 加 `model` 组：
```json
"model": {
  "defaultTitle": "默认模型", "defaultDesc": "选择 agent 默认使用的模型",
  "byokTitle": "我的私有模型", "byokBadge": "私有·不计费", "addByok": "新建私有模型",
  "platformDefault": "平台默认", "public": "公共模型"
}
```

- [ ] **Step 5: en 对应英文**

```json
"adminModels": "Models"
```
admin.json:
```json
"model": {
  "title": "Model Management", "description": "Configure AI models, API keys, pricing and plans",
  "empty": "No models yet", "test": "Test", "setDefault": "Set Default",
  "types": { "llm": "LLM", "embedding": "Embedding", "crawl": "Crawler", "image": "Image" }
}
```
dashboard.json:
```json
"model": {
  "defaultTitle": "Default Model", "defaultDesc": "Choose the default model for the agent",
  "byokTitle": "My Private Models", "byokBadge": "Private · No billing", "addByok": "Add Private Model",
  "platformDefault": "Platform Default", "public": "Public Models"
}
```

- [ ] **Step 6: 类型检查 + dev 验证 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "App.tsx|AdminSidebar|AdminLayout" || echo "no errors"
```
`npm run dev`，访问 /admin/models + /dashboard/settings。

```bash
git add frontend/src/App.tsx frontend/src/components/admin/AdminSidebar.tsx frontend/src/layouts/AdminLayout.tsx \
        frontend/src/i18n/locales/zh/admin.json frontend/src/i18n/locales/en/admin.json \
        frontend/src/i18n/locales/zh/dashboard.json frontend/src/i18n/locales/en/dashboard.json \
        frontend/src/i18n/locales/zh/common.json frontend/src/i18n/locales/en/common.json
git commit -m "feat(model): admin 模型管理路由+导航+i18n"
```

---

## Task 30: 端到端验证

- [ ] **Step 1: 全栈重启**

```bash
cd d:/Users/JZJ/Desktop/agent && powershell -ExecutionPolicy Bypass -File scripts/_restart-dev-stack.ps1
```
设 `MODEL_KEY_ENCRYPTION_KEY`（`AesGcmCodec.randomKeyBase64()` 生成）。三服务健康。

- [ ] **Step 2: 端到端流程**

1. admin /admin/models 建 GPT-4o（key+价 input 2500/output 10000+倍率 1.5+关联 pro 套餐+设默认？否，另建平台默认）
2. pro 用户 /dashboard/settings 默认模型选 GPT-4o
3. 发消息 → 用 GPT-4o；查 usage_event 记 model_code=gpt-4o + cost 正确（按倍率）
4. 聊天区临时切平台默认 → 用默认模型
5. 用户加 BYOK 私有模型 → 选中 → 发消息 → usage_event byok=true cost=0，配额不增
6. admin 删活跃默认 LLM → python 降级平台默认 + 报警日志

- [ ] **Step 3: 全量测试回归**

```bash
cd frontend && npx vitest run 2>&1 | tail -8
cd ../python-ai && python -m pytest tests/test_model_registry.py tests/test_reporter_cost.py -q
cd ../novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH mvn -q -o -pl studio-modules/studio-module-agent -am test -Dtest=AgentModelResolverTest
```

- [ ] **Step 4: 最终提交（若有遗留）**

```bash
git status && git add -A && git commit -m "feat(model): 端到端验证收尾" || echo "clean"
```

---

Part 5 完成。模块 3 全部实现完毕。

返回 [主索引](./2026-06-19-model-config.md)。
