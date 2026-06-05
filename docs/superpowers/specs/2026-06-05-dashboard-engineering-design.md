# 用户/管理端仪表盘 + 后端工程化

> 日期：2026-06-05  
> 状态：**设计已确认**（用户确认 2026-06-05）  
> 参考：后端工程化对齐 `roncoo-education`；前端基于开源模板改造（非 roncoo 前端）

## 1. 目标

| 能力 | 说明 |
|------|------|
| **用户端仪表盘** | 登录后进入 `/dashboard`：统计卡片 + 小说列表 + 快捷进编辑器 |
| **管理端仪表盘** | `/admin`：用户 CRUD、平台统计、内容概览（仅 `role=admin`） |
| **前台样式统一** | 保留 GSAP 营销落地页，配色/字体对齐 shadcn 主题 |
| **后端工程化** | 参考 roncoo：`common-core`、`API 受众分层`、`Biz 层`、`Feign 契约` |
| **编辑器** | **不改动**现有 styled-components 样式体系 |

### 非目标

- 编辑器 UI 重构
- 完整 RBAC 权限字符串体系（Phase 1 仅 role 三元组：user / vip / admin）
- 独立管理端仓库（管理端与用户端同在 `frontend/`）
- 替换现有 `secureFetch` / 加密签名栈

---

## 2. 前端架构

### 2.1 开源模板选型

| 区域 | 模板 | 用途 |
|------|------|------|
| 用户仪表盘 | [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) | 侧栏布局、统计卡片、表格、暗色模式 |
| 管理端 CRUD | [marmelab/shadcn-admin-kit](https://github.com/marmelab/shadcn-admin-kit) | 用户列表/编辑、数据表格、鉴权无关脚手架 |
| 营销页 | 现有 `frontend/src/components/marketing/*` | 保留 GSAP 滚动叙事，仅做 token 对齐 |
| 编辑器 | 现有 `EditorPageLayout` | 零改动 |

### 2.2 技术栈变更（增量引入）

```
frontend/
├── 现有：Vite + React 18 + styled-components + react-router-dom
└── 新增：Tailwind CSS v4 + shadcn/ui + @tanstack/react-query（仅 dashboard/admin 路由）
```

**双样式体系策略**：`/dashboard`、`/admin` 使用 Tailwind/shadcn；`/editor`、`/login` 等保持 styled-components，通过路由级 CSS scope 隔离。

### 2.3 路由结构

| 路径 | 页面 | 守卫 |
|------|------|------|
| `/` | `HomePage`（营销） | 已登录可选跳 `/dashboard` |
| `/login` `/register` | 认证页 | 公开 |
| `/dashboard` | 用户仪表盘首页 | 需登录 |
| `/dashboard/novels` | 小说管理列表 | 需登录 |
| `/dashboard/settings` | 账户设置 | 需登录 |
| `/admin` | 管理端首页统计 | `role=admin` |
| `/admin/users` | 用户 CRUD | `role=admin` |
| `/admin/stats` | 平台统计 | `role=admin` |
| `/editor/:chapterId?` | 编辑器 | 需登录（不变） |

**登录后默认跳转**：`/dashboard`（替代现有 `/editor` 直跳）。

### 2.4 用户仪表盘页面

**上半区 — 统计卡片（4 张）**

| 卡片 | 数据来源 |
|------|----------|
| 小说总数 | `GET /api/content/auth/dashboard/summary` |
| 章节总数 | 同上 |
| 本周新增字数 | 同上（按 `chapter.updated_at` 聚合） |
| Agent 调用次数 | 同上（`agent_run` 表 count） |

**下半区 — 创作工作台**

- 最近编辑小说（按 `updated_at` 排序，最多 6 条）
- 「继续写作」→ `/editor/:chapterId`
- 「新建小说」→ 调现有 `POST /api/content/novels` 后跳编辑器

### 2.5 管理端页面

| 页面 | 功能 |
|------|------|
| `/admin` | 平台总用户数、今日注册、活跃用户数、总小说/章节数 |
| `/admin/users` | 分页列表、搜索用户名/邮箱、编辑 role/status、禁用账户 |
| `/admin/stats` | 注册趋势折线图、Agent 调用趋势（近 30 天） |

### 2.6 营销页视觉统一

将 shadcn 默认主题 token 映射到现有 `palette`（`frontend/src/styles/theme.ts`）：

| shadcn token | 映射到现有 |
|--------------|------------|
| `--background` | `bgPage` `#f0f0f0` |
| `--foreground` | `ink` `#1a1a1a` |
| `--primary` | `accent` `#e9b50b` |
| `--muted-foreground` | `textMuted` |
| `--border` | `border` |
| `--radius` | `8px`（shadcn 默认） |

字体：营销页引入 `Inter`（与 shadcn-admin 一致），fallback 保持 `system-ui`。

### 2.7 前端鉴权增强

```typescript
// frontend/src/stores/userStore.ts（新建）
interface UserProfile {
  userId: string
  username: string
  email: string
  role: 'user' | 'vip' | 'admin'
}

// frontend/src/components/guards/RequireAuth.tsx
// frontend/src/components/guards/RequireAdmin.tsx
```

- 登录/刷新后调用 `GET /api/auth/auth/info` 写入 `userStore`
- `RequireAdmin`：`role !== 'admin'` → 403 页或重定向 `/dashboard`
- 复用现有 `secureFetch`、`useAuthReady`

---

## 3. 后端工程化（参考 roncoo-education）

### 3.1 目标模块结构

```
novel-agent/
├── agent-common/
│   ├── agent-common-security/   # 已有
│   └── agent-common-core/       # 新建：Result、Page、Enum、BaseBiz
├── agent-feign/
│   ├── agent-feign-auth/        # 新建：Auth 服务 Feign 契约
│   └── agent-feign-content/     # 新建：Content 服务 Feign 契约
├── agent-auth/
│   └── service/
│       ├── api/                 # 公开：login/register/captcha
│       ├── auth/                # 用户端：info/profile
│       └── crm/                 # 管理端：user/page、stats
├── agent-content/
│   └── service/
│       ├── auth/                # 用户端：dashboard/summary、novels（迁移）
│       └── crm/                 # 管理端：stats/overview
└── agent-gateway/
    └── filter/
        ├── CrmGatewayFilter     # 校验 admin role
        └── AuthAudienceFilter   # 校验已登录（auth 段）
```

### 3.2 API 受众分层

URL 模式：`/api/{service}/{audience}/{resource}`

| audience | 含义 | Gateway 行为 |
|----------|------|--------------|
| `api` | 公开接口 | 无 JWT 要求（现有 login/register） |
| `auth` | 用户端 | 需有效 JWT |
| `crm` | 管理端 | 需 JWT + `roles` 含 `admin` |

**兼容策略**：旧路径 `/api/auth/login` 保留 6 个月，Gateway 内部 rewrite 到 `/api/auth/api/login`；前端新代码直接用新路径。

### 3.3 统一响应（agent-common-core）

```java
// com.novel.agent.common.core.base.Result
public record Result<T>(int code, String msg, T data) {
    public static <T> Result<T> ok(T data) { ... }
    public static <T> Result<T> fail(int code, String msg) { ... }
}

// com.novel.agent.common.core.base.Page
public record Page<T>(List<T> list, long totalCount, int pageCurrent, int pageSize) {}
```

**迁移策略**：新 API 返回 `Result<T>`；旧 API 保持原样，逐步迁移。

### 3.4 分层模式

```
Controller（薄）→ Biz（编排）→ Dao（数据访问）
```

| 层 | 职责 | 示例 |
|----|------|------|
| Controller | 参数校验、调 Biz、返回 Result | `CrmUserController` |
| Biz | 业务编排、跨 Dao 调用 | `CrmUserBiz` |
| Dao | 封装 Repository/Mapper | `UserInfoDao` |

现有 `Service` 类不一次性删除；新功能走 Biz，旧功能按模块逐步迁移。

### 3.5 DTO 命名

```
{Audience}{Entity}{Action}Req / Resp

AuthUserInfoResp
AuthDashboardSummaryResp
CrmUserPageReq
CrmUserPageResp
CrmPlatformStatsResp
```

### 3.6 Gateway 增强

**现有**：`AuthGatewayFilter` 解析 JWT → 注入 `X-User-Id`、`X-User-Name`、`X-Session-Id`

**新增**：
- 解析 JWT `roles` claim → 注入 `X-User-Roles`（逗号分隔）
- `CrmGatewayFilter`（order -99）：路径含 `/crm/` 时校验 roles 含 `admin`
- `AuthAudienceFilter`（order -98）：路径含 `/auth/`（非 `/api/auth/api/`）时校验 JWT 存在

### 3.7 新增 API 清单

#### agent-auth

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/auth/info` | 返回 userId、username、email、role、emailVerified |
| PUT | `/api/auth/auth/profile` | 用户修改昵称等（Phase 1 可选） |
| GET | `/api/auth/crm/user/page` | 管理端用户分页 |
| GET | `/api/auth/crm/user/{id}` | 用户详情 |
| PUT | `/api/auth/crm/user/{id}` | 修改 role/isActive |
| GET | `/api/auth/crm/stats/overview` | 总用户、今日注册、活跃用户 |

#### agent-content

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/content/auth/dashboard/summary` | 当前用户小说/章节/字数/Agent 统计 |
| GET | `/api/content/auth/dashboard/recent-novels` | 最近编辑小说列表 |
| GET | `/api/content/crm/stats/overview` | 全平台小说/章节/Agent 统计 |
| GET | `/api/content/crm/stats/trends` | 近 30 天注册/Agent 趋势 |

### 3.8 数据库

**无需新表**。统计基于现有表聚合：

| 表 | 统计用途 |
|----|----------|
| `auth_user` | 用户数、今日注册、role 分布 |
| `novel` | 小说总数（按 user_id 或全局） |
| `chapter` | 章节数、字数（`content` 长度或 `word_count` 字段） |
| `agent_run` | Agent 调用次数 |

若 `chapter` 无 `word_count`，Phase 1 用 `length(content)` 近似，后续可加冗余字段。

### 3.9 Feign 契约（Phase 3）

```java
// agent-feign-content/interfaces/IFeignDashboardStats.java
@FeignClient(name = "agent-content", path = "/internal/content")
public interface IFeignDashboardStats {
    @GetMapping("/stats/platform")
    PlatformStatsDto getPlatformStats();
}
```

管理端首页统计由 `agent-auth` 的 `CrmHomeBiz` Feign 聚合 auth + content 数据（对齐 roncoo `CrmHomeDataBiz`）。

### 3.10 Consumer 权限同步

`PermissionListener` 落地：

```
登录/注册 → MQ → Consumer → Redis SET user:role:{userId} = role
```

Gateway `CrmGatewayFilter` 优先读 `X-User-Roles`（JWT），Redis 作缓存兜底。

---

## 4. 分阶段落地

```
Phase F1 — 用户端仪表盘（前端为主）
  shadcn 基础设施 + /dashboard 页面 + 营销页 token 对齐
  依赖后端 Phase B2 的 dashboard API（可先用 mock）

Phase F2 — 管理端（前端 + 后端 CRM API）
  /admin 布局 + 用户 CRUD + 平台统计
  依赖 Phase B2 + B3

Phase B1 — agent-common-core
  Result / Page / StatusEnum / BaseBiz

Phase B2 — API 分层 + Gateway Filter + dashboard/stats API
  新路径、X-User-Roles、auth/info 扩展

Phase B3 — Biz 层 + CRM 用户管理
  CrmUserBiz、CrmUserController、用户分页/编辑

Phase B4 — Feign 模块 + 跨服务统计聚合
  agent-feign-*、CrmHomeBiz

Phase B5 — 旧 API 迁移与兼容路径退役
  旧 Controller 标记 @Deprecated，文档记录下线日期
```

**推荐并行顺序**：

```
Week 1: B1 → B2（后端基础）∥ F1 前端脚手架
Week 2: B3 → F1 联调 dashboard API
Week 3: F2 管理端前端 ∥ B3 CRM API
Week 4: B4 Feign 聚合 + F2 联调
Week 5: B5 清理 + E2E 验收
```

---

## 5. 安全约束

- 所有新 API 走现有 Gateway 链：解密 → 签名 → 鉴权
- `/api/auth/crm/**`、`/api/content/crm/**` 必须过 `CrmGatewayFilter`
- 管理端前端路由 `RequireAdmin` 仅 UX 层；**真正的权限校验在 Gateway**
- `secureFetch` 加密路径：crm API 纳入 `crypto-manifest` 发布脚本

---

## 6. 验收标准

| 场景 | 预期 |
|------|------|
| 普通用户登录 | 跳 `/dashboard`，可见统计 + 小说列表 |
| 普通用户访问 `/admin` | 403 或重定向 `/dashboard` |
| admin 登录 | 可访问 `/admin` 用户列表、编辑 role |
| admin 禁用用户 | 该用户下次请求 401 |
| 营销页 | 视觉与 dashboard 主色一致，GSAP 动效保留 |
| 编辑器 | 样式与行为与改动前一致 |
| 旧 API | `/api/auth/login` 仍可用 |

---

## 7. 文件索引（实施时创建/修改）

### 前端（Phase F1/F2）

| 操作 | 路径 |
|------|------|
| 新建 | `frontend/tailwind.config.ts`、`frontend/components.json` |
| 新建 | `frontend/src/layouts/DashboardLayout.tsx`、`AdminLayout.tsx` |
| 新建 | `frontend/src/pages/dashboard/*`、`frontend/src/pages/admin/*` |
| 新建 | `frontend/src/stores/userStore.ts` |
| 新建 | `frontend/src/components/guards/RequireAuth.tsx`、`RequireAdmin.tsx` |
| 修改 | `frontend/src/App.tsx`（新路由） |
| 修改 | `frontend/src/pages/HomePage.tsx`（跳 `/dashboard`） |
| 修改 | `frontend/src/styles/theme.ts`（shadcn token 映射） |
| 修改 | `frontend/package.json`（tailwind、shadcn 依赖） |

### 后端（Phase B1–B5）

| 操作 | 路径 |
|------|------|
| 新建 | `agent-common/agent-common-core/` |
| 新建 | `agent-feign/agent-feign-auth/`、`agent-feign-content/` |
| 新建 | `agent-auth/.../service/auth/`、`service/crm/`、`service/api/` |
| 新建 | `agent-content/.../service/auth/dashboard/`、`service/crm/stats/` |
| 新建 | `agent-gateway/.../filter/CrmGatewayFilter.java` |
| 修改 | `agent-gateway/.../filter/AuthGatewayFilter.java`（X-User-Roles） |
| 修改 | `novel-agent/pom.xml`（新模块） |
