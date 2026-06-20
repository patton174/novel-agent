# 仪表盘与管理后台去 Demo 化重构 设计

> 日期：2026-06-20
> 范围：仅 `frontend/` 下的仪表盘 `/dashboard` 与管理后台 `/admin`。编辑器 `/editor`、Agent 对话、登录/注册、营销首页暂不在本次范围，沿用现有 Tailwind/shadcn，后续单独立项。

## 一、目标

把仪表盘与管理后台从「demo 感」重构为**专业、高颜值、桌面/手机分端**的产品级界面，并沉淀一套可复用的 Pro 级组件库。原则：在现有设计系统上**演进**，而非推翻重做主题与安全对齐。

## 二、关键决策（已与用户确认）

| # | 决策点 | 结论 |
|---|--------|------|
| 1 | 组件库基底 | shadcn/Tailwind v4 底座 + `@tabler/icons-react` 图标 + Tabler 设计 token 映射为 CSS 变量。**不引入** `@tabler/core` 的 Bootstrap CSS，避免两套 reset 冲突。 |
| 2 | 视觉基调 | **Editorial · 安静的奢华**：indigo `#4f46e5` / slate 灰阶 / 玻璃新拟态表面 / 柔影 / `rounded-2xl`。大留白、超大 tabular-nums 数值、细分隔线代替卡片边框、indigo 仅作单点强调。延续现有 DeepSeek 式无图标 KPI。仪表盘与后台共用此基调。 |
| 3 | 菜单图标 | `@tabler/icons-react` 5000+ 图标，每项定制。**选中时 SVG 笔画描边绘制动画**（stroke-dashoffset 从隐藏到绘制），选中态常驻描边、未选中淡色（`text-muted-foreground`）。 |
| 4 | 侧边栏分组 | 管理后台：四分组全部展开 + 分组小标题（**概览 / 运营 / 内容 / 系统**），不折叠——后台后续会持续加项，分组是刚需。仪表盘：项少不分组，仅加小标题做视觉分隔。 |
| 5 | 端策略 | 桌面/手机**两套独立页面组件**，路由层按设备（`useMediaQuery`/UA）分发。业务逻辑抽共享 hook，避免重复。 |
| 6 | 手机导航 | 仪表盘：**底部 Tabbar**，4 项 `概览 / 小说 / 书库 / 我的`（「我的」聚合计费+设置+头像信息）。管理后台手机端：顶部栏 + 抽屉（项多，管理员场景不常在手机操作，不强上 tabbar）。 |
| 7 | 暗色模式 | 保留现有亮/暗切换。Editorial 基调在暗色下：slate-950 背景、slate 边框、indigo glow 强调。 |
| 8 | 重构范围 | 仅仪表盘 + 后台。编辑器/Agent/登录/营销**本次不动**，与重构区物理隔离（独立布局 + 样式作用域，互不污染）。 |

## 三、组件库封装清单

在 `frontend/src/components/pro/` 下新建一套 Pro 级组件（不污染现有 `ui/`，渐进替换）。每个组件独立文件、单一职责、带暗色适配、可被桌面/手机两套页面复用。

| 组件 | 路径 | 职责 |
|------|------|------|
| `ProButton` | `pro/ProButton.tsx` | 多变体（primary/ghost/subtle/danger）、加载态、图标位、尺寸。CVA 定义。 |
| `ProTable` | `pro/ProTable.tsx` | 列定义驱动、分页插槽、空态、loading 骨架、行 hover、紧凑/舒适密度。复用现有 `DataTableFrame`/`ResponsiveTable` 思路重写。 |
| `ProPagination` | `pro/ProPagination.tsx` | 页码、跳页、总数、每页条数。 |
| `ProBreadcrumb` | `pro/ProBreadcrumb.tsx` | 面包屑，自动从路由或 props 生成。 |
| `ProTabs` | `pro/ProTabs.tsx` | 顶部标签页 + 内容区，描边下划线选中态。 |
| `ProSelect` | `pro/ProSelect.tsx` | 下拉选择，radix Portal，搜索/分组/暗色。复用 `DropdownSelect` 经验。 |
| `ProChart` 系列 | `pro/charts/` | 基于 recharts 封装 Area/Bar/Line/Sparkline，统一 indigo 色板、Tooltip、空态、轴格式（沿用 `DashboardTokenUsageChart` 模式）。 |
| `ProChartKpi` | `pro/ProChartKpi.tsx` | 大数值 + 标签 + 趋势箭头 + 可选 sparkline 的 KPI 卡（Editorial 风格）。 |
| `ProTabBar` | `pro/ProTabBar.tsx` | 手机端底部导航栏，图标描边动画复用菜单同款。 |
| `ProFooter` | `pro/ProFooter.tsx` | 页脚，链接 + 版权 + 主题切换入口。 |
| `ProNavTabs` | `pro/ProNavTabs.tsx` | 顶部导航栏标签（多标签页式，可关闭）。 |
| `ProSidebar` | `pro/ProSidebar.tsx` | 分组侧边栏，接 `@tabler/icons-react`，描边动画选中态。桌面常驻 / 手机抽屉两模式。 |
| `IconStroke` | `pro/IconStroke.tsx` | 描边动画底层：包裹 tabler icon，`stroke-dasharray`/`stroke-dashoffset` CSS 动画，active 时绘制。 |

### 图标描边动画实现

Tabler icons 是 1.5px stroke 的 SVG line icons。`IconStroke` 包裹层：
- 默认态：`stroke` = `currentColor`（淡色 `text-muted-foreground`），`stroke-dasharray: 0` 正常显示。
- 选中态：给 `<svg>` 内所有 `<path>/<line>` 设 `pathLength=1`、`stroke-dasharray: 1`、`stroke-dashoffset` 从 1 → 0 做 ~400ms ease-out 过渡（笔画从无到有绘制），绘制完成常驻。indigo 强调色。
- 用 CSS 自定义属性 + Tailwind `@layer` 或全局 keyframes 实现，尊重 `prefers-reduced-motion`。

## 四、桌面/手机分端架构

```
src/pages/dashboard/
  novels/                      # 业务 hook 共享层
    useNovelsPage.ts           # 数据获取、分页、筛选逻辑（端无关）
  desktop/
    NovelsPage.desktop.tsx     # 桌面布局：表格 + 侧栏分组
  mobile/
    NovelsPage.mobile.tsx      # 手机布局：卡片列表 + 底部 tabbar
  NovelsPage.tsx               # 分发器：useIsMobile → desktop/mobile
```

- `NovelsPage.tsx` 仅做 `<Suspense>` + 设备判定 + 分发，不含布局。
- 共享 `useNovelsPage` hook 承载所有数据/状态逻辑，两套页面只负责呈现。
- 路由不变（`/dashboard/novels` → `NovelsPage.tsx`），无破坏性 URL 变更。

管理后台同理（`pages/admin/<page>/desktop|mobile`）。

## 五、视觉规范（Editorial）

基于现有 `globals.css` 的 `@theme` token，**不新增框架**，仅补充 Pro 组件专用变量：

- 数值：`text-[2rem] font-bold tabular-nums tracking-tight`（延续 `DashboardKpiCard`）。
- 分隔：优先 `border-b border-border/60` 细线分组，减少卡片边框堆叠。
- 强调：indigo 仅用于选中态、主操作、关键数据点；大面积中性 slate。
- 间距：大留白，KPI 区 `gap-6`，区块间 `space-y-8`。
- 圆角：统一 `rounded-2xl`（卡片）/ `rounded-xl`（面板内分组）。
- 柔影：`shadow-soft`；hover `shadow-hover`。
- 暗色：复用现有 `.dark` 体系，Editorial 暗色用 slate-950 底 + slate-800 边 + indigo glow。

## 六、迁移与隔离策略

- 新组件放 `components/pro/`，**不删不改现有 `ui/`**，渐进替换仪表盘/后台页面引用。
- 仪表盘/后台页面重构时，逐页从 shadcn 原语切到 `Pro*` 组件；每页独立提交，可回滚。
- 编辑器/Agent/登录页继续用 `ui/`，**零影响**。
- 图标从 `lucide-react` 切到 `@tabler/icons-react` 仅限重构区，编辑器区不动。

## 七、依赖

- 新增 `@tabler/icons-react`（已验证 npm 3.44.0 存在）。
- 复用现有 `recharts`、`framer-motion`、`class-variance-authority`、`radix-ui`。
- 不新增 CSS 框架。

## 八、非目标（本次不做）

- 编辑器 / Agent 对话 / 登录注册 / 营销首页的重构。
- 引入 `@tabler/core` Bootstrap CSS 或放弃 Tailwind。
- 后端 API 变更（纯前端重构）。
- 已有的「用户上传书籍不入公共书库」（item 5，已记录、另案）。

## 九、验收

- 仪表盘/后台桌面端：Editorial 基调、分组侧栏、描边动画、Pro 组件统一观感。
- 仪表盘/后台手机端：独立页面、底部 tabbar（仪表盘）、抽屉（后台）、移动适配。
- 编辑器/Agent/登录页：视觉与功能零回归。
- 亮/暗切换正常。
- 现有 vitest 不新增失败（4 个已知 master 基线失败除外）。
