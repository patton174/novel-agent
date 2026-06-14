# 前端 UI 待优化清单（Phase 17+）



> **用途**：交给下一轮开发继续抛光；基于 [`frontend-ui-audit-round3-2026-06-12.md`](frontend-ui-audit-round3-2026-06-12.md) 三轮验收中**仍未关闭**的项整理。  

> **当前基线**：Phase 1–16 已落地；**Phase 18–21** 关闭 backlog 全部项；工程收敛完成。  

> **约定**：完成一项后在 `[ ]` 打 `[x]`，并注明 PR 或 commit。



---



## 优先级说明



| 级别 | 含义 |

|------|------|

| **P1** | 用户主路径可感知的不一致或体验缺口，建议优先 |

| **P2** | 管理端/边缘场景/视觉 polish，可分批 |

| **P3** | 工程收敛、文档、长期维护 |



---



## P1 — 认证与账户



### 1.1 VerifyEmail 并入 Auth 页面族



- [x] **问题**：`/verify-email` 仍用 `AuthResultCard` 单卡，与 Login/Register/Forgot 的 `AuthShell` 双栏不一致；邮件深链用户感觉「换了一套 UI」。

- [x] **涉及**：`frontend/src/pages/VerifyEmailPage.tsx`

- [x] **方向**：复用 `AuthShell`（可仅右栏表单区 + 移动端 Wordmark），保留现有成功/失败/loading 状态与 `MKT_CTA_AUTH` 按钮。

- [x] **验收**：与 `/login` 视觉同族；深色模式下卡片背景与 Login 一致。  

  → Phase 17 `16fe145`



### 1.2 SliderCaptchaModal 移动端与安全区



- [x] **问题**：注册验证码模态无 `pb-safe`；`statusLabel` 使用 truncate，长错误信息被截断；底部按钮区在 iPhone 上可能被 home indicator 遮挡。

- [x] **涉及**：`frontend/src/components/auth/SliderCaptchaModal.tsx`

- [x] **验收**：iOS 安全区留白；错误文案可完整阅读（换行或多行，勿 truncate 唯一错误源）。  

  → Phase 18



### 1.3 Forgot/Reset 端到端联调（前后端）



- [x] **问题**：前端 UI 已完整（`/forgot-password`、`/reset-password`），需确认 API 与邮件链路与 UI 文案一致。

- [x] **涉及**：Forgot/Reset 页、`userApi`、novel-studio `PasswordResetService`

- [x] **验收**：真机收信 → 点链 → 改密 → 登录成功；过期/无效链展示与 UI 一致。  

  → Phase 17–18 前端 + `4c246de` novel-studio 已部署



---



## P1 — Dashboard / 创作台



### 2.1 Novels 页「新建」与「继续写作」行为统一



- [x] **问题**：卡片「继续写作」带 `?novelId=`；Intro「新建小说」与空态「创建第一部作品」仍链裸 `/editor`。

- [x] **涉及**：`frontend/src/pages/dashboard/NovelsPage.tsx`、`lib/editorRoutes.ts`

- [x] **方向**：新建统一 `/editor?action=create` 打开 `CreateNovelModal`；继续写作用 `editorNovelHref`。

- [x] **验收**：同一页内 primary 动作语义不矛盾。  

  → Phase 18



### 2.2 Dashboard 子页 Header「进入编辑器」上下文



- [x] **问题**：仅在 `/dashboard` 概览隐藏了 QuickActions 的编辑器 CTA；`/dashboard/novels` 等子页仍显示裸链 `/editor`。

- [x] **涉及**：`frontend/src/components/dashboard/DashboardQuickActions.tsx`

- [x] **方向**：全 `/dashboard/*` 隐藏重复顶栏 CTA（各子页自有 primary）。

- [x] **验收**：任意 dashboard 路由顶栏不出现与页面内 primary CTA 完全重复的裸 `/editor` 按钮。  

  → Phase 18



### 2.3 Dashboard Home Hero 视觉降噪（可选 P1）



- [x] **问题**：概览 Hero 仍有大 blur 圆、渐变、badge，创作台内偏「营销 landing」，与 Admin 冷静风反差大。

- [x] **涉及**：`frontend/src/pages/dashboard/DashboardHomePage.tsx`

- [x] **方向**：减弱装饰层，改为与 `AppPageIntro` 同语言的简洁顶条。

- [x] **验收**：与 `NovelsPage` / `BookstorePage` intro 风格同一档位。  

  → Phase 18



---



## P1 — Editor 移动



### 3.1 小屏分屏高度自适应（iPhone SE 等）



- [x] **问题**：`StoryMobileChapterPicker` 固定 `max-h-[32vh]`，极小屏上编辑区可能 ≤50% 视高，长章写作偏挤。

- [x] **涉及**：`StoryMobileChapterPicker.tsx`

- [x] **方向**：`max-h-[min(28dvh,36svh)]` +「全屏编辑」收起选章区。

- [x] **验收**：375×667 视口下可一键收起选章区扩大编辑区。  

  → Phase 18



### 3.2 Agent 流式进行中过长时的轻量提示



- [x] **问题**：历史消息可折叠「创作过程」；**当前 run 流式中** timeline 仍可能占满屏。

- [x] **涉及**：`EditorChatMessage.tsx`

- [x] **方向**：移动流式中默认折叠过程层，保留交付摘要 + 展开 toggle。

- [x] **验收**：移动单轮 Agent 回复滚动距离明显短于现状。  

  → Phase 18



---



## P2 — 营销页



### 4.1 首页 Footer 与 Danmaku 衔接



- [x] **问题**：`HomeFooterSection` full variant 使用 `-mt-16` 叠进 Danmaku 深色区，色带变化突兀。

- [x] **涉及**：`HomeFooterSection.tsx`、`HomeDanmakuSection.tsx`

- [x] **方向**：取消负 margin；Danmaku 底部渐变过渡至 Footer CTA 带。

- [x] **验收**：首页末尾滚动无「压层」感。  

  → Phase 17 + Phase 18 渐变



### 4.2 桌面 Hero 首屏长度



- [x] **问题**：移动已降密；桌面仍 `md:min-h-[92vh]` + demo + scroll hint，首屏 CTA 可能偏下。

- [x] **涉及**：`HomeHeroSection.tsx`

- [x] **方向**：降低 min-height 至 `78vh`。

- [x] **验收**：1280×800 首屏可见双 CTA，无需滚动。  

  → Phase 18



### 4.3 Feasibility Persona 卡视觉克制



- [x] **问题**：三卡 violet/emerald/amber hover ring 装饰过重，偏 demo 页。

- [x] **涉及**：`HomeFeasibilitySection.tsx`

- [x] **方向**：统一 surface 卡 + primary icon，去掉 per-card 渐变 blur。

- [x] **验收**：与 Pricing 卡片区视觉重量接近。  

  → Phase 18



### 4.4 装饰 chip 与 CTA 圆角规范（文档 + 少量代码）



- [x] **问题**：主 CTA 已 `rounded-xl`；Eyebrow、Guide TOC、`AdminQuickLinks` 仍 `rounded-full`。

- [x] **涉及**：`AdminQuickLinks.tsx`、`HomeHeroSection` eyebrow；`frontend/DESIGN-TOKENS.md`

- [x] **验收**：规范写入 DESIGN-TOKENS；Admin 快捷链与 dashboard 按钮几何一致。  

  → Phase 18



---



## P2 — Admin 管理端



### 5.1 Crawler 页移动信息密度



- [x] **问题**：子任务置顶 + 折叠后页面仍极长；行内 4 个 icon + 标题/进度/错误单行过载；子任务硬限 50 条无分页。

- [x] **涉及**：`frontend/src/pages/admin/CrawlerPage.tsx`、`CrawlJobRow.tsx`

- [x] **方向**：移动行改为两行布局（信息行 + 操作行）；次要操作收进 `KebabMenu`；子任务分页或「加载更多」。

- [x] **验收**：375px 宽下单条子任务无需横向扫视即可读懂状态；页长可接受（主观 + 录屏）。  

  → Phase 19



### 5.2 SiteContent 移动布局



- [x] **问题**：移动侧栏页面列表堆在顶部，占大量垂直空间，无 tab/折叠。

- [x] **涉及**：`frontend/src/pages/admin/SiteContentPage.tsx`

- [x] **方向**：移动改为 Select 或 bottom sheet 选页；编辑区全宽。

- [x] **验收**：移动编辑区首屏可见 textarea 顶缘。  

  → Phase 19



### 5.3 Admin Modal 收敛到 AppModalShell（工程）



- [x] **问题**：Editor 已用 `AppModalShell`；Admin 仍多处直写 `DialogContent` + `appModalClasses`（`UserEditDialog`、`CatalogReaderModal`、`CrawlJobDetailModal` 等）。

- [x] **涉及**：`frontend/src/components/admin/**`、`AppModalShell.tsx`

- [x] **方向**：逐步替换为 `AppModalShell` 或提取 `AdminDialog` 薄封装，统一 header/footer 间距。

- [x] **验收**：Admin 主要弹窗已走 `AppModalShell`；`PlansPage` 表单弹窗仍裸 `DialogContent`（低优先级）。  

  → Phase 19–20



### 5.4 Revenue 饼图与 MRR 溢出



- [x] **问题**：模型名多时饼图 label 曾重叠；MRR hint 长文本小屏可能溢出。

- [x] **涉及**：`RevenueCharts.tsx`、`RevenuePage.tsx`

- [x] **验收**：窄屏仅图例+tooltip，无重叠 label；MRR 区 long text truncate + title tooltip。  

  → Phase 19



### 5.5 Stats / AdminHome 与 Stats、Revenue 差异化



- [x] **问题**：AdminHome KPI 与 Stats/Revenue 仍有功能重叠感；Stats 仅固定 7/30/90 日（若已做需验证空态）。

- [x] **涉及**：`AdminHomePage.tsx`、`StatsPage.tsx`

- [x] **方向**：Home 只保留快捷入口 + 6 KPI；Stats 增加空数据说明或链到 Users。

- [x] **验收**：管理员从 `/admin` 能明确「下一步去哪」。  

  → Phase 19



---



## P2 — Billing



### 6.1 用量明细默认可发现



- [x] **问题**：无 runFilter 且无事件时，明细表可能整段隐藏，用户不知有明细功能。

- [x] **涉及**：`frontend/src/pages/dashboard/BillingPage.tsx`

- [x] **方向**：空态也展示表头 +「暂无记录」。

- [x] **验收**：新用户进 Billing 能看到明细区存在，即使为空。  

  → Phase 18



---



## P3 — 工程与品牌收敛



### 7.1 Loader 统一



- [x] **问题**：`AuthSpinner`、`BrandLoader` 等多套并存。

- [x] **涉及**：`AppSpinner.tsx`、re-export

- [x] **方向**：页面级 = BrandLoader；行内/按钮 = AppSpinner。

- [x] **验收**：Phase 17 已引入 `AppSpinner`；见 `DESIGN-TOKENS.md`。



### 7.2 删除或归档 deprecated 导出



- [x] **问题**：`confirmDialogStore` 仍有 `@deprecated` 别名；`AppPageStack` 的 `narrow`/`wide` deprecated props。

- [x] **部分**：已删除 `EditorModalShell`；call site 改 `compact` + `@/stores/appDialog`。  

  → Phase 20



### 7.3 设计 token 单页说明



- [x] **问题**：`marketingCta.ts`、`appButtonTokens.ts` 分散。

- [x] **涉及**：`frontend/DESIGN-TOKENS.md`

- [x] **验收**：简短规范已写入。  

  → Phase 18



---



## 桌面 Editor（P2，非阻塞）



### 8.1 侧栏信息架构简化



- [x] **问题**：小说树 → 会话 → 搜索 → batch → kebab → memory/settings，新手学习曲线陡。

- [x] **涉及**：`EditorSidebar.tsx`、`NovelSessionList.tsx`

- [x] **方向**：可折叠区块默认态；或 onboarding 提示；次要功能收进「更多」。

- [x] **验收**：侧栏底部「新对话」主 CTA + 可关闭快速开始提示；设置收进 Kebab。  

  → Phase 20



### 8.2 桌面 Modal 全部走 AppModalShell



- [x] **与 5.3 重叠**；Editor 设置、StoryMemory、CreateNovel 等核对是否已统一；PlansPage / CoverGenerate / MoveChapter 已迁移。  

  → Phase 20



---



## 建议实施顺序（给执行人）



```

批次 A ✅：1.1 · 1.2 · 2.1 · 2.2 · 2.3

批次 B 部分 ✅：3.1 · 3.2

批次 C 部分 ✅：4.1–4.4 · 6.1 · 7.1 · 7.3

批次 D ✅：5.1 · 5.2 · 5.3 · 5.4 · 5.5 · 7.2(EditorModalShell)

批次 E ✅：7.2(appDialog/compact) · 8.1 · 8.2 · PlansPage Modal

下一批 ✅ 见 [`frontend-ui-audit-round4-2026-06-12.md`](frontend-ui-audit-round4-2026-06-12.md) Phase 21：

- [x] 删除 `AuthResultCard`（零引用）
- [x] 删除 `NovelAiCubeLoader` / `ThinkingHandLoader` + CSS
- [x] `AuthSpinner` → `AppSpinner` 全站替换
- [x] Guide TOC / STEP badge → `rounded-xl`
- [x] Feasibility eyebrow、Login/Register 营销 pill → `rounded-xl`
- [x] `useEditorMobile` → `useAppMobile`
- [x] 清理 `styles` deprecated 文件（`editorTheme.ts`、`surfaces.tsx`）
- [x] vitest smoke（`frontend/src/lib/uiSmoke.test.ts`）

```



---



## 线上回归清单（每项优化合并后必测）



1. https://www.novel-agent.cn 无痕强刷  

2. **Auth**：login → register → captcha → verify-email；forgot → reset → login  

3. **Dashboard**：概览 / novels / billing / settings；顶栏 CTA 不重复  

4. **Editor 移动 ≤767px**：分屏选章、折叠 Agent 过程、写章保存  

5. **Admin 移动**：users 卡片、crawler 子任务、plans 价格 `¥/月`  

6. **深色模式**：Auth 卡、Dashboard 侧栏、Editor 主区  



---



## 参考文档



| 文档 | 说明 |

|------|------|

| [`frontend-ui-audit.md`](frontend-ui-audit.md) | 原始批判清单 + Phase 1–16 闭环摘要 |

| [`frontend-ui-audit-revalidation-2026-06-12.md`](frontend-ui-audit-revalidation-2026-06-12.md) | 二次验收 |

| [`frontend-ui-audit-round3-2026-06-12.md`](frontend-ui-audit-round3-2026-06-12.md) | 三轮验收与通过判定 |

| [`frontend-ui-audit-round4-2026-06-12.md`](frontend-ui-audit-round4-2026-06-12.md) | 四轮验收（v2 通过）+ Phase 21 |

| [`frontend-ui/README.md`](frontend-ui/README.md) | **文档索引 + Phase 21 摘要** |

| [`plans/2026-06-12-frontend-phase2.md`](plans/2026-06-12-frontend-phase2.md) | Phase 1–21 执行记录 |

| [`frontend/DESIGN-TOKENS.md`](../frontend/DESIGN-TOKENS.md) | CTA / Modal / Loader 规范 |



---



## 不在本轮范围（勿误开）



- 后端忘记密码邮件送达率 / 垃圾邮件（运维配置）  

- 全站 redesign / 换配色体系  

- 编辑器桌面三栏改单栏（产品级改版）  

- E2E 测试套件搭建（可单独立项）

