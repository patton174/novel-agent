# Frontend Phase 2 — Admin 移动 + 营销抛光

> **Goal:** 完成 `docs/frontend-ui-audit.md` 中 Phase 1 统一后剩余的可交付项：Admin 移动可用性、营销移动体验、图表可读性。

**Architecture:** 不引入新 UI 框架；沿用「移动卡片 + 桌面表格」双轨、`ConfirmDialogHost`、Skeleton 加载。优先改共享组件（`DataTableFrame`、`CrawlJobRow`、图表），再改单页。

**Tech Stack:** React、Tailwind、shadcn、Recharts

---

## 状态总览

| 项 | 状态 | 说明 |
|---|---|---|
| Modal / Loader / Button 统一 | ✅ Phase 1 | `EditorModalShell`、`ConfirmDialogHost`、Button `rounded-xl` |
| UserTable / Audit / Plans 移动卡片 | ✅ 已有 | 各页独立实现 |
| Admin 顶栏返回创作台 | ✅ 已有 | `AdminLayout` sm 以下 icon |
| Billing 用量移动卡片 | ✅ 已有 | `UsageEventCard` |
| Home 对比表滑动提示 | ✅ 已有 | Feasibility section |
| Pricing 高亮卡 mobile scale | ✅ 已有 | 仅 `md:scale` |

---

## Phase 2A — 本批执行

- [x] **UsersPage**：去掉冗余「搜索」按钮，450ms debounce + 提示文案
- [x] **PlansPage Dialog**：表单 `grid-cols-1 sm:grid-cols-2`，移动单列
- [x] **CrawlJobRow**：错误信息 `line-clamp-2`，运维可读
- [x] **RevenueCharts**：饼图下方模型图例（label 已关，靠 Tooltip 不够）
- [x] **SiteContentPage**：移动顶栏 action 换行，避免 header 挤压
- [x] **OrchestratorLogTerminal**：移动高度再收紧
- [x] **AdminPagination**：0 条时隐藏分页区（与 Audit 一致）
- [x] **AppShellCardHeader**：小屏 action 区纵向堆叠（全局 Admin 卡片）

## Phase 2B — 后续（未在本批）

- [x] CatalogReaderModal 移动目录/正文同屏优化（全高抽屉 + 目录头关闭 + 搜索）
- [x] CrawlJobDetailModal 增加 footer 操作
- [x] StatsPage 日期范围选择（7/30/90 日）
- [x] 营销 demo（EditorApp / AgentTrace / CapabilityMini）styled → `marketingDemoClasses.ts` + Tailwind
- [x] 编辑器全模块 neumorphic/styled → shadcn/Tailwind（`components/editor/**` 零 styled-components）

## Phase 2C — 本批执行

- [x] **品牌统一**：i18n / Wordmark / demo 标题 → Novel AI
- [x] **滚动分镜 rhythm**：`CursorFeatureSection` padding 对齐 `py-20`（5rem）
- [x] **Story intro 标题**：与 Feasibility 同级 `text-3xl md:text-4xl`
- [x] **Hero demo 移动可见**：小屏 `scale-[0.94]`，不再 `hidden sm:block`
- [x] **mkt-card-lift**：仅 `(hover: hover)` 设备生效
- [x] **MarketingSubpageHero**：小屏 action 全宽
- [x] **编辑器 Switch**：`NeumorphicSwitch` → shadcn `Switch`（Composer + Settings）

## Phase 2D — 本批执行

- [x] **AuthShell** 侧栏版权 → Novel AI
- [x] **AuthCodeField** 注册验证码字段统一（复用 `authFieldClass` + 错误/提示）
- [x] **VerifyEmailPage** 底部隐私/协议/首页链接
- [x] **ChatComposer** styled-components → Tailwind（`rounded-xl border-border bg-background shadow-sm`）
- [x] **EditorSettingsModal** 设置项 Tailwind 化（去掉 neumorphic ToggleRow）

## Phase 2E — 本批执行

- [x] **EditorModalShell** styled → Tailwind React 组件 + `editorModalClasses.ts`
- [x] **EditorModalPanel** prop `$size` → `size`（全编辑器 Modal 对齐）
- [x] **EditorSendIconLayer** Tailwind 化（去掉 styled `$visible`）
- [x] **删除** `styles/surfaces/auth.ts` 零引用遗留 neumorphic Auth 壳

## Phase 2F — 本批执行

- [x] **CreateNovelModal** neumorphic 表单 → Tailwind + `editorFieldClasses`（对齐 Auth 输入）
- [x] **CreateNovelModal** 结构对齐 `EditorModalHeader` / `EditorModalBody` + 关闭按钮
- [x] **EditorButton** `primary` / `secondary` / `ghost` / `close` / `danger` → shadcn `Button`（其余 variant 仍走 styled）

## Phase 2G — 本批执行

- [x] **StoryMemoryModal** + `storyMemoryModalClasses`：布局与卡片 Tailwind 化，删除 `storyMemoryModalStyles.ts`
- [x] **TodoDetailModal** / **SubagentDetailModal** 头部 styled → Tailwind
- [x] **AskUserForm** 输入/进度/选项 Tailwind + `agentFormClasses` + `editorFieldClass`
- [x] **EditorButton** `accent` / `tool` → shadcn `Button`

## Phase 2H — 本批执行

- [x] **EditorButton** `icon` / `nav` / `tab` / `dashed` / `panel` / `toggle` → shadcn + `editorButtonClasses.ts`
- [x] **EditorSidebar** 全量 styled → Tailwind（284px 侧栏、小说卡片、搜索框）
- [x] **EditorMobileNav** 移动菜单栏 → shadcn `Button` + Tailwind

## Phase 2I — 本批执行

- [x] **NovelSessionList** 会话列表 / 批量栏 / 加载更多 → Tailwind
- [x] **MotionSegmentRail** 记忆 Modal Tab 指示器 → Tailwind（保留 morph 过渡）
- [x] **EditorButton** `choice` / `chapter` / `volume` / `segment` → shadcn（仅 `send` 仍 styled）

## Phase 2J — 收尾（编辑器 + 营销 demo + Button 全量）

- [x] **EditorPageLayout** / **EditorCenterTabs** / **EditorChatPanel** / **EditorChatMessageList** / **EditorChatMessage** → Tailwind
- [x] **EditorStoryPanel** / **ChapterInlineDiff** → Tailwind
- [x] **ChatMessageSurface** → `chatMessageSurfaceClasses.ts`
- [x] **EditorButton** 全 variant shadcn/Tailwind；**删除** `EditorButton.styles.ts`（~370 行）
- [x] **营销 demo** 三组件 + `marketingDemoClasses.ts`；删除 `marketingEditorAppDemo.ts` / `marketingAgentDemo.ts`
- [x] **删除** 零引用 `styles/chatMessageSurface.ts`

## Phase 3 — 营销 landing / GSAP 分镜 Tailwind 化

- [x] **marketing.ts** shell 删除；`marketingShellClasses.ts`（PageWrapper / Background / Main）
- [x] **cursorLanding.ts** + **marketingScroll.ts** + **marketingEditorShowcase.ts** 删除
- [x] **cursorLandingClasses.ts** / **marketingScrollClasses.ts** / **marketingEditorShowcaseClasses.ts**
- [x] CursorLanding / NovelCursorMock / CursorHeroStack / HomeScrollStory / storyScenes / MarketingChatScene / MarketingStoryCopy
- [x] **MarketingChatOrchestrationDemo** + **MarketingHeroDemo** → `marketingOrchestrationDemoClasses.ts`
- [x] **NovelAiWordmark** → CSS 变量动画（`marketing-effects.css`）
- [x] `components/marketing/**` 零 styled-components

## Phase 4 — Agent timeline / loaders / motion / UI 收尾

- [x] **timelineStyles.ts** 删除 → `timelineClasses.ts` + `agent-timeline-effects.css`
- [x] **loaders/** shimmer + cube/hand/pencil → `shimmerClasses.ts` + `agent-effects.css`
- [x] **motionStyles.ts** 删除 → `motionClasses.ts`
- [x] **agent/** trace/context/chat/markdown/toolIcons → `agent*Classes.ts` + `agent-ui.css`
- [x] **outlineStyles.ts** / **prose.ts** 删除 → `outlineClasses.ts`
- [x] **KebabMenu** / **DropdownSelect** / **MotionTabBar** → `uiMenuClasses.ts`
- [x] 剩余 timeline todo/excerpt/subagent → Tailwind
- [x] **App.tsx** 移除 `ThemeProvider`（styled-components 运行时包已从 bundle 剔除）

## Phase 5 — Auth 抛光 + 依赖收尾

- [x] **认证控件高度统一** `h-11`（44px）：`authFieldClass`、`AuthSubmitButton`、`AuthCodeField`、`MKT_CTA_AUTH` / `MKT_CTA_AUTH_OUTLINE`、注册页验证码按钮
- [x] **RegisterPage** 营销侧栏 footer → 与 Login 一致的 pill 标签（去掉 ✓ 列表）
- [x] **删除死代码** `components/login/button/Button.tsx`、`components/login/input/Input.tsx` 及空目录
- [x] **移除 styled-components**：`pnpm remove styled-components`、删除 `types/styled.d.ts`、vite `manualChunks` 去掉 `styled`
- [x] **HomeFeasibilitySection** 对比表标题下增加移动端横向滑动提示文案

---

## Phase 2B 验收

1. `/admin/catalog` 阅读器：手机点「目录」→ 全高抽屉 + 搜索 + 选章后正文占满
2. `/admin/crawler` 任务详情：footer 可启动/暂停/取消/删除
3. `/admin/stats`：切换 7/30/90 日，图表描述同步
