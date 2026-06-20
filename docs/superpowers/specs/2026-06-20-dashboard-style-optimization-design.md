# 仪表盘样式优化设计

> 日期：2026-06-20
> 范围：前端 `frontend/` + 后端 `novel-studio/studio-module-billing`（仅弹幕去重）
> 验收：线上部署（CI），不本地起 Consumer 连生产 MQ

## 背景

用户提出 6 项仪表盘样式问题：概览缺 Token 消耗图、书库导航多余、我的小说/我的书库布局过松、账户设置与左下角重复且头像不统一、评论可重复提交、热力图只显示一半。

经探查：
- Token 用量数据源已存在（`fetchUsageTrends` → `/api/billing/auth/usage/trends`），无需后端改动。
- 上传书籍泄漏进公共书库的根因是公共列表查询 `CrawlCatalogNovelRepository.findAllByOrderByUpdatedAtDesc` 未按 `source`/`ownerId` 过滤（用户本次未提此点，但相关：用户在“我的书库”加跳转到公共书库，公共书库应只含公共书）。**本次仅在前端移除书库导航，公共书库过滤不在本次范围**——除非用户补充要求。
- 弹幕后端 `SiteDanmakuBiz.create` 无每用户去重，需补。

## 目标 / 非目标

**目标**
1. 概览页加近 30 天 Token 消耗图。
2. 移除侧边栏「书库」导航项；「我的书库」加「去书库添加更多」跳转。
3. 我的小说卡片收紧、我的书库改为列表行布局。
4. 移除侧边栏「账户设置」导航项（与左下角重复）；左下角用户卡头像与编辑页统一。
5. 弹幕每用户仅一次（后端 + 前端 localStorage 双重锁）。
6. 热力图显示近 13 周（填满卡片宽度）。

**非目标**
- 公共书库按 source/ownerId 过滤（本次不做；后续单独提）。
- 评价的编辑覆盖（已确认采用“永久仅一次”）。

## 详细设计

### 1. Token 消耗图（概览页）

- 数据源：`fetchUsageTrends(days=30)`（`frontend/src/api/billingApi.ts` 已存在），返回 `UsageTrendPoint[] {date, tokens, costMicros}`。服务端只返回有事件的天，稀疏——前端接受跳点（与 admin `UsageTrendChart` 一致）。
- 新组件 `frontend/src/components/dashboard/DashboardTokenUsageChart.tsx`：recharts `AreaChart`，镜像 `DashboardActivityTrendChart` 的卡片骨架与空态（`AppShellCard`、加载 Skeleton、无数据文案）。Y 轴用 `formatTokenCount`。
- `DashboardHomePage`：
  - Token 数据用**独立 effect + 独立 try-catch** 拉取（不复用现有 `Promise.all`），避免 token 接口失败拖垮活动/小说数据；失败时 token 图显示空态。结果存 `dashboardCache`（新增 `tokenTrends` 字段）。
  - 布局：新增一行全宽 `AppShellCard` 放 Token 图，置于「KPI 行」与「活动趋势/热力图行」之间。
- i18n：`dashboard:home.tokenTitle / tokenDesc / tokenEmpty`（zh + en）。

### 2. 移除「书库」导航 + 我的书库跳转

- `AppSidebar.tsx`：`mainNav` 删除 `dashboardBookstore` 项。
- `BookstorePage` 路由保留；`DashboardLayout.PAGE_META` 保留 bookstore 条目（直达时 header 标题正确）。
- `MyLibraryPage`：`AppPageIntro` 的 `action` 区追加「去书库添加更多」按钮 → `/dashboard/bookstore`（与刷新按钮并列）。
- i18n：`dashboard:myLibrary.browseBookstore`。

### 3. 紧凑布局（混合）

**我的小说 `NovelsPage.tsx`**（保留封面卡片，整体收紧）：
- 网格：`gap-5`→`gap-4`、`xl:grid-cols-3`→`xl:grid-cols-4`；骨架 `min-h-[360px]`→`min-h-[300px]`。
- 卡片：封面 `aspect-[3/4]`→`aspect-[4/5]`，正文 `p-5`→`p-4`，标题 `text-lg`→`text-base`，`mb-2/mb-3`→`mb-1.5`，底部操作区 `p-4`→`p-3 gap-2`→`gap-1.5`。
- 顶部彩条透明度逻辑不变。

**我的书库 `MyLibraryPage.tsx`**（卡片网格 → 列表行）：
- 替换 `<div className="grid ...">` 为 `<div className="divide-y divide-border rounded-2xl border border-border bg-surface shadow-soft">`，每本书一行。
- 每行：左侧小封面/图标（`size-10`）+ 中部标题/作者/章节数（单行 truncate）+ 右侧「加入小说」按钮。
- 骨架相应改为行骨架（`h-16` × N）。

### 4. 账户设置去重 + 头像统一

- `AppSidebar.tsx`：`mainNav` 删除 `dashboardSettings` 项。
- 左下角用户卡改造（参考 `EditorUserCard`）：
  - 用 `PixelAvatarFrame` + `UserPixelAvatar size=36 animated` 替换现在 initials 的 `Avatar`。
  - 容器加渐变 `bg-gradient-to-r from-muted/50 via-muted/30 to-transparent`、`ring-1 ring-border/40`。
  - 主文本 `profile.username`，副文本 `profile.email`（缺则 `t('common:nav.dashboardSettings')`）。
  - 整卡 `role="button"` 点击 → `/dashboard/settings`；未验证邮箱红点保留。
- `DashboardQuickActions`/其它引用 settings 路由处不受影响（左下角仍可进）。

### 5. 弹幕每用户仅一次（永久）

**后端**：
- `SiteDanmakuRepository` 加 `boolean existsByUserId(Long userId);`。
- `SiteDanmakuBiz.create`：`userId != null && userId > 0 && existsByUserId(userId)` → `throw new BizException(ResultCode.BAD_REQUEST, "已评价过，感谢支持")`。访客不限制（无 userId）。

**前端**：
- `SettingsFeedbackCard`：挂载读取 `localStorage['novelstudio:feedback:submitted:<userId>']`，已提交 → 显示「已评价」并禁用输入框与按钮。
- 提交成功后写入该 key，立即切到「已评价」态。
- 后端返回 `已评价过` 错误时也切到「已评价」态（防绕过）。
- i18n：`dashboard:settings.feedbackAlreadySubmitted = "已评价"`（zh）/ `"Submitted"`（en）。
- userId 取自 `useUserStore` profile。

### 6. 热力图近 13 周

- `ActivityHeatmap.tsx`：`RECENT_WEEKS = 3` → `13`。
- 13 列 × 12px(cell) + 12×4px(gap) ≈ 204px，填满右侧卡片宽度，修复“只显示一半”。
- 其余布局/月份标签/tooltip 逻辑不变（已按周对齐生成，自动适配）。

## 变更清单

| # | 文件 | 改动 |
|---|------|------|
| 1 | `frontend/src/components/dashboard/DashboardTokenUsageChart.tsx` | 新建 |
| 2 | `frontend/src/pages/dashboard/DashboardHomePage.tsx` | 加 token 图 + fetch |
| 3 | `frontend/src/stores/dashboardCacheStore.ts` | 加 `tokenTrends` 缓存 |
| 4 | `frontend/src/components/dashboard/AppSidebar.tsx` | 删 bookstore+settings 导航；左下角用户卡换像素头像+渐变 |
| 5 | `frontend/src/pages/dashboard/MyLibraryPage.tsx` | 列表行布局 + 去书库跳转按钮 |
| 6 | `frontend/src/pages/dashboard/NovelsPage.tsx` | 卡片收紧 + 4 列 |
| 7 | `frontend/src/components/dashboard/SettingsFeedbackCard.tsx` | localStorage 永久锁 + 已评价态 |
| 8 | `frontend/src/components/dashboard/ActivityHeatmap.tsx` | `RECENT_WEEKS=13` |
| 9 | `frontend/src/i18n/locales/{zh,en}/dashboard.json` | 新文案 |
| 10 | `novel-studio/.../billing/repository/SiteDanmakuRepository.java` | `existsByUserId` |
| 11 | `novel-studio/.../billing/service/biz/SiteDanmakuBiz.java` | create 去重校验 |

## 测试

- 前端：现有 `dashboardCacheStore.test.ts`、`dashboardMetrics.test.ts` 需更新（tokenTrends 字段）；`uiSmoke.test.ts` 冒烟。
- 后端：`SiteDanmakuBiz` 去重单测（mock repo）。
- 人工：概览 token 图渲染、侧边栏两项消失、我的书库列表行 + 跳转、我的小说 4 列紧凑、左下角像素头像、弹幕二次提交被拒、热力图 13 周满宽。

## 风险

- `fetchUsageTrends` 失败时返回 `[]`，token 图显示空态——已通过独立 effect 隔离，不影响其余卡片。
- 左下角像素头像依赖 `pixelAvatarStore` 已同步——`DashboardLayout` 已在挂载时 `fetchUserInfo`，但未 `syncPixelAvatarForUser`。需在 layout 或 sidebar 内补一次 `syncPixelAvatarForUser(profile.userId)`（参考 `EditorUserCard`）。
