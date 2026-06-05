# 仪表盘前端实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `frontend/` 内引入 shadcn 仪表盘（用户端 + 管理端），统一营销页视觉，编辑器样式不动。

**Architecture:** 路由级双样式体系——`/dashboard`、`/admin` 用 Tailwind+shadcn；`/editor` 等保持 styled-components。用户端基于 satnaing/shadcn-admin 布局壳改造；管理端基于 marmelab/shadcn-admin-kit CRUD 模式。鉴权复用 `secureFetch` + 新 `userStore`。

**Tech Stack:** Vite 5, React 18, Tailwind CSS v4, shadcn/ui, TanStack Query, react-router-dom v6, 现有 secureFetch 安全栈

**Spec:** `docs/superpowers/specs/2026-06-05-dashboard-engineering-design.md`（用户已确认 2026-06-05）

---

## Phase F0 — shadcn 基础设施

### Task F0-1: 安装 Tailwind + shadcn 依赖

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/index.css`（或新建 `frontend/src/styles/globals.css`）

- [ ] **Step 1: 安装依赖**

```bash
cd frontend
pnpm add tailwindcss @tailwindcss/vite class-variance-authority clsx tailwind-merge lucide-react @tanstack/react-query
pnpm add -D @types/node
```

- [ ] **Step 2: 配置 Vite Tailwind 插件**

在 `frontend/vite.config.ts` 添加：

```typescript
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 保留现有 proxy / obfuscator 配置
})
```

- [ ] **Step 3: 创建 `frontend/src/styles/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-background: #f0f0f0;
  --color-foreground: #1a1a1a;
  --color-primary: #e9b50b;
  --color-primary-foreground: #1a1a1a;
  --color-muted: #e8e8e8;
  --color-muted-foreground: #888888;
  --color-border: rgba(0, 0, 0, 0.08);
  --radius: 0.5rem;
}
```

- [ ] **Step 4: 仅 dashboard/admin 路由引入 globals**

在 `DashboardLayout.tsx` / `AdminLayout.tsx` 根节点 `import '../styles/globals.css'`，**不要**在 `App.tsx` 全局引入（避免污染编辑器 styled-components）。

- [ ] **Step 5: 初始化 shadcn**

```bash
cd frontend
pnpm dlx shadcn@latest init
# 选择：Vite, neutral, CSS variables
```

- [ ] **Step 6: 添加基础组件**

```bash
pnpm dlx shadcn@latest add button card badge avatar separator skeleton table dropdown-menu sheet sidebar
```

- [ ] **Step 7: 验证构建**

```bash
cd frontend && pnpm run build
```

Expected: PASS（允许 shadcn 新增文件）

---

## Phase F1 — 用户端仪表盘

### Task F1-1: userStore + 鉴权守卫

**Files:**
- Create: `frontend/src/stores/userStore.ts`
- Create: `frontend/src/api/userApi.ts`
- Create: `frontend/src/components/guards/RequireAuth.tsx`
- Create: `frontend/src/components/guards/RequireAdmin.tsx`
- Modify: `frontend/src/utils/authApi.ts`（登录后拉 info）

- [ ] **Step 1: 创建 userStore**

```typescript
// frontend/src/stores/userStore.ts
import { create } from 'zustand'

export type UserRole = 'user' | 'vip' | 'admin'

export interface UserProfile {
  userId: string
  username: string
  email: string
  role: UserRole
  emailVerified?: boolean
}

interface UserState {
  profile: UserProfile | null
  setProfile: (p: UserProfile | null) => void
  clear: () => void
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clear: () => set({ profile: null }),
}))
```

- [ ] **Step 2: 创建 userApi**

```typescript
// frontend/src/api/userApi.ts
import { secureFetch } from '../security/secureFetch'
import type { UserProfile } from '../stores/userStore'

export async function fetchUserInfo(): Promise<UserProfile> {
  const res = await secureFetch('/api/auth/auth/info')
  if (!res.ok) throw new Error('Failed to load user info')
  const json = await res.json()
  return json.data ?? json
}
```

- [ ] **Step 3: 创建 RequireAuth**

```typescript
// frontend/src/components/guards/RequireAuth.tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthReady } from '../../security/useAuthReady'
import { isLoggedIn } from '../../utils/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const authReady = useAuthReady()
  const location = useLocation()
  if (!authReady) return <div className="grid min-h-screen place-items-center text-muted-foreground">加载中…</div>
  if (!isLoggedIn()) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}
```

- [ ] **Step 4: 创建 RequireAdmin**

```typescript
// frontend/src/components/guards/RequireAdmin.tsx
import { Navigate } from 'react-router-dom'
import { useUserStore } from '../../stores/userStore'
import { RequireAuth } from './RequireAuth'

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const role = useUserStore((s) => s.profile?.role)
  return (
    <RequireAuth>
      {role === 'admin' ? children : <Navigate to="/dashboard" replace />}
    </RequireAuth>
  )
}
```

- [ ] **Step 5: 登录成功后拉取 info**

在 `LoginPage.tsx` 登录成功回调中，`await fetchUserInfo()` → `useUserStore.getState().setProfile(...)`，再 `navigate('/dashboard')`。

---

### Task F1-2: Dashboard 布局壳（参考 shadcn-admin）

**Files:**
- Create: `frontend/src/layouts/DashboardLayout.tsx`
- Create: `frontend/src/components/dashboard/AppSidebar.tsx`
- Create: `frontend/src/components/dashboard/DashboardHeader.tsx`
- Create: `frontend/src/pages/dashboard/DashboardHomePage.tsx`
- Create: `frontend/src/pages/dashboard/NovelsPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: DashboardLayout 骨架**

侧栏导航项：
- 概览 → `/dashboard`
- 我的小说 → `/dashboard/novels`
- 账户设置 → `/dashboard/settings`
- 进入编辑器 → `/editor`
- 管理后台 → `/admin`（仅 `role=admin` 显示）

- [ ] **Step 2: DashboardHomePage 统计卡片**

调用 `GET /api/content/auth/dashboard/summary`（后端未就绪时用 mock）：

```typescript
interface DashboardSummary {
  novelCount: number
  chapterCount: number
  weeklyWordCount: number
  agentRunCount: number
}
```

4 张 `Card` 横排（移动端 2 列）。

- [ ] **Step 3: 最近小说列表**

调用 `GET /api/content/auth/dashboard/recent-novels`，每行：封面占位、标题、最近编辑时间、「继续写作」按钮。

- [ ] **Step 4: 注册路由**

```tsx
// App.tsx 新增
<Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
  <Route index element={<DashboardHomePage />} />
  <Route path="novels" element={<NovelsPage />} />
  <Route path="settings" element={<SettingsPage />} />
</Route>
```

- [ ] **Step 5: 修改登录后跳转**

- `HomePage.tsx`：已登录 → `/dashboard`（原 `/editor`）
- `LoginPage.tsx`：成功 → `/dashboard`

---

### Task F1-3: 营销页视觉统一

**Files:**
- Modify: `frontend/src/styles/theme.ts`
- Modify: `frontend/src/components/marketing/MarketingNav.tsx`
- Modify: `frontend/index.html`（Inter 字体）

- [ ] **Step 1: index.html 引入 Inter**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: MarketingNav 按钮色对齐 primary `#e9b50b`**

检查 `MarketingNav` CTA 按钮 hover/active 与 shadcn `--color-primary` 一致。

- [ ] **Step 3: 营销页字体栈**

在 `MarketingShell` 或 `globals` 营销区域设置 `font-family: 'Inter', system-ui, sans-serif`。

- [ ] **Step 4: 视觉回归**

浏览器打开 `/`，确认 GSAP 动效正常、主色一致。

---

## Phase F2 — 管理端

### Task F2-1: Admin 布局 + 首页统计

**Files:**
- Create: `frontend/src/layouts/AdminLayout.tsx`
- Create: `frontend/src/pages/admin/AdminHomePage.tsx`
- Create: `frontend/src/api/adminApi.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: AdminLayout**

复用 Dashboard 侧栏模式，导航：概览、用户管理、平台统计。顶栏显示「返回用户端」链到 `/dashboard`。

- [ ] **Step 2: adminApi**

```typescript
export async function fetchPlatformStats() {
  const res = await secureFetch('/api/auth/crm/stats/overview')
  return (await res.json()).data
}

export async function fetchContentStats() {
  const res = await secureFetch('/api/content/crm/stats/overview')
  return (await res.json()).data
}
```

- [ ] **Step 3: AdminHomePage 卡片**

展示：总用户、今日注册、总小说、总章节、Agent 总调用。

- [ ] **Step 4: 路由**

```tsx
<Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
  <Route index element={<AdminHomePage />} />
  <Route path="users" element={<UsersPage />} />
  <Route path="stats" element={<StatsPage />} />
</Route>
```

---

### Task F2-2: 用户 CRUD（shadcn-admin-kit 模式）

**Files:**
- Create: `frontend/src/pages/admin/UsersPage.tsx`
- Create: `frontend/src/components/admin/UserTable.tsx`
- Create: `frontend/src/components/admin/UserEditDialog.tsx`

- [ ] **Step 1: UserTable**

TanStack Table + shadcn Table：
- 列：ID、用户名、邮箱、角色、状态、注册时间、操作
- 分页调 `GET /api/auth/crm/user/page?pageCurrent=1&pageSize=20`
- 搜索框：username 模糊

- [ ] **Step 2: UserEditDialog**

字段：role（select: user/vip/admin）、isActive（switch）
提交 `PUT /api/auth/crm/user/{id}`

- [ ] **Step 3: 空态与错误处理**

403 → toast「无管理权限」；网络错误走 `appToastStore`。

---

### Task F2-3: 平台统计图表

**Files:**
- Create: `frontend/src/pages/admin/StatsPage.tsx`
- Add dependency: `recharts`

```bash
pnpm add recharts
```

- [ ] **Step 1: 注册趋势折线图**

`GET /api/content/crm/stats/trends?days=30` → `registrationTrend[]`

- [ ] **Step 2: Agent 调用趋势**

同接口 → `agentRunTrend[]`

- [ ] **Step 3: 响应式**

移动端图表高度 240px，桌面 360px。

---

## Phase F3 — 联调与验收

- [ ] 普通用户：登录 → `/dashboard` → 统计正确 → 点「继续写作」进编辑器
- [ ] admin：可见 `/admin` 侧栏入口 → 用户列表分页 → 修改 role 生效
- [ ] 普通用户访问 `/admin` → 重定向 `/dashboard`
- [ ] 营销页 `/` 主色与 dashboard 一致，GSAP 正常
- [ ] `pnpm run build` 通过
- [ ] 生产 env：`VITE_ROUTE_OBFUSCATION` 下 dashboard API 在 manifest 中

---

## 依赖后端 Phase

| 前端任务 | 依赖后端 API |
|----------|-------------|
| F1-2 统计卡片 | `GET /api/content/auth/dashboard/summary`（Phase B2） |
| F1-2 最近小说 | `GET /api/content/auth/dashboard/recent-novels`（Phase B2） |
| F1-1 userStore | `GET /api/auth/auth/info`（Phase B2） |
| F2-1 管理首页 | `GET /api/auth/crm/stats/overview`（Phase B3） |
| F2-2 用户 CRUD | `GET/PUT /api/auth/crm/user/**`（Phase B3） |
| F2-3 趋势图 | `GET /api/content/crm/stats/trends`（Phase B2） |

后端未就绪时，各页面用 `src/mocks/dashboard.ts` 占位，联调前替换。
