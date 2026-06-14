# Novel Agent 前端 UI 优化方案（桌面/移动分离 · 移动端性能 · 文案与瘦身）

> **制定日期**：2026-06-14
> **对应批判**：[`frontend-ui-critique-2026-06-14.md`](frontend-ui-critique-2026-06-14.md)（问题编号 C-1 … C-13）
> **目标**：在不推翻 Phase 21 已收敛的设计 token 前提下，解决四类结构性问题——移动端卡顿、桌面/移动未分离、页面臃肿、文案重复。
> **约定**：完成一项在 `[ ]` 打 `[x]`，并注明 PR / commit。**禁止本地启 Consumer 连生产 MQ**；验收走 https://www.novel-agent.cn（见 `CLAUDE.md`）。

---

## 一、优化原则

1. **移动端不是窄屏桌面**：移动端应有独立的信息优先级与交互密度，而非把桌面 DOM 塞进 `max-md:`。
2. **性能优先于装饰**：移动端默认关闭高成本视觉（blur orb / 弹幕 backdrop-blur / 常驻 demo），动效让位于流畅。
3. **文案单一数据源**：所有面向用户的文字进 i18n，建立术语表与 CTA 字典，组件不硬编码。
4. **先止血、后重构**：P0 性能止血可独立小步上线；C-4 分离策略属架构级，先定规范、增量执行，不做一次性大改版。
5. **可验证**：每项给「验收标准」+「线上回归点」。

---

## 二、优先级体系

| 级别 | 含义 | 上线节奏 |
|------|------|---------|
| **P0** | 移动端可感知卡顿，直接影响留存 | 立即，单项可独立合并 |
| **P1** | 结构性技术债 / 品牌问题，主路径可感知 | 1–2 个迭代内 |
| **P2** | 信息架构瘦身、文案统一 | 分批 |
| **P3** | 工程收敛、死代码、断点规范 | 随手清理 |

---

## 三、P0 — 移动端性能止血

### P0-1 弹幕在移动端降级 / 关闭（对应 C-1）

- **现状**：`HomeDanmakuSection` 无 `md:hidden`；`DanmakuMarquee` 4 轨常驻 rAF，每条 `backdrop-blur-md` + 大阴影。
- **方案**（按代价从小到大，至少落地 a+b）：
  - **a.** 移动端去掉每条弹幕的 `backdrop-blur-md`，改为不透明/半透明纯色背景（`DanmakuMarquee.tsx` `ITEM_CLASS`）。
  - **b.** 移动端降轨道数（`TRACKS` 4 → 2）并降低 spawn 频率（提高 `MIN_GAP`）。
  - **c.** 可选：移动端用 `useAppMobile()` 把整段弹幕替换为**静态 3–4 条评论卡**（无 rAF），保留「创作者说」叙事但零动画。
  - **d.** 页面不可见时（`IntersectionObserver` / `document.hidden`）暂停 rAF。
- **验收**：iPhone SE / 中端安卓首页滚动至弹幕区，掉帧明显减少；DevTools Performance 无常驻长任务。
- **回归**：首页移动滚动、`prefers-reduced-motion` 下仍正常。

### P0-2 编辑器流式批处理 + 列表瘦身（对应 C-2）

- **现状**：`message.delta` / `think.delta` 走 `flushNow()`，逐 chunk `setMessages` + `syncStreamState` 全量 map；timeline 全量 map 无虚拟化；`TimelineTextBlock` 每帧重解析 Markdown。
- **方案**：
  - **a.** 把 `message.delta` / `think.delta` 从 `flushNow()` 改为 `batcher.schedule()`（rAF 合帧），仅在 run 结束 / 工具边界 `flushNow`（`useEditorAgentStream.ts:410-417`）。
  - **b.** `syncStreamState` 避免每次深拷贝整个 messages 数组；仅更新变化的最后一条（结构共享）。
  - **c.** `EditorChatMessage` 加 `React.memo`，比较 message id + 内容长度 + 状态；流式中只让"正在生成"的那条重渲染。
  - **d.** `TimelineTextBlock` 的 react-markdown 结果按 content `useMemo`；流式中可先渲染纯文本、完成后再 Markdown 化。
  - **e.** 消息列表与移动章节 picker 引入虚拟化（`@tanstack/react-virtual`），优先长会话 / 长篇小说。
- **验收**：移动端单轮 Agent 长回复流式过程帧率稳定；React Profiler 单 chunk 重渲染节点数显著下降。
- **回归**：流式正文 / think / 工具进度 / 章节流式写入 / 中断重连均正常。

### P0-3 营销高成本视觉移动端关闭（对应 C-3）

- **方案**：
  - **a.** `MarketingAmbient` 在移动端直接 `return null`（移动端不渲染 `blur(72px)` orb），或把 orb 改为静态低成本渐变。
  - **b.** ScrollStory 三幕 demo 在移动端**只保留 1 幕**或替换为静态截图，关闭另外两路常驻 rAF（`MarketingChatOrchestrationDemo` 仅在视口内且非移动时运行）。
  - **c.** `HomeTimelineSection` 移动端去掉卡片 `filter: blur` 入场，仅保留 `opacity`/`translate`（filter 合成最贵）。
  - **d.** `MarketingNav` 滚动态 `backdrop-blur-xl` 移动端降为不透明背景。
- **验收**：首页移动端 Lighthouse / DevTools 滚动无持续 GPU 合成峰值。

---

## 四、P1 — 桌面/移动分离策略（对应 C-4）

> **不做一次性大改版**；先确立规范，新增/重构页面按规范执行，存量按 ROI 增量迁移。

### P1-1 统一断点与移动判断的「单一入口」

- **方案**：
  - 全站新增组件**优先用 `min-width`（`md:`）单方向**书写，避免 `md:` 与 `max-md:` 混用；`max-md:` 仅用于"必须覆盖桌面默认"的少数场景。
  - 废弃营销 `900px` 第三断点，统一到 `767/768`（`cursorLandingClasses.ts`）。
  - JS 判断只用 `useAppMobile()` / `matchesAppMobile()`，禁止散落 `window.matchMedia`。
  - 在 `DESIGN-TOKENS.md` 增「响应式书写规范」一节。
- **验收**：新 PR 不引入第三断点；lint/review checklist 覆盖。

### P1-2 抽象 `ResponsiveTable`（卡片/表格双 DOM 收敛）

- **现状**：`UserTable`、`PlansPage`、`BillingPage`、`AuditLogPage`、`CatalogAdminPanel` 各自手写「移动卡片 + 桌面表格」两套 markup。
- **方案**：抽 `<ResponsiveTable columns rows renderMobileCard>` 或 `<DataTableFrame mobileVariant="card">`，**数据与列定义单源**，桌面渲染 `<Table>`、移动渲染卡片，文案/空态只写一遍。
- **验收**：上述 5 处迁移后，新增表格页只需提供 columns + mobileCard 模板；移动/桌面文案不再双写。

### P1-3 Modal 移动端 sheet 化收敛

- **现状**：`appModalClasses.ts` 用 8+ 个 `max-md:` 把居中 Dialog 强转全屏。
- **方案**：抽 `AppSheetModal`（移动端走 bottom/side Sheet，桌面走居中 Dialog），由组件内部按 `useAppMobile()` 选择，调用方不再拼 `max-md:inset-0…`。`CatalogReaderModal` 的 aside 双角色拆为桌面列 + 移动 drawer 两态由该封装托管。
- **验收**：`APP_MODAL_MOBILE_FULL` 覆盖链收敛到单组件；移动端弹窗有安全区与 sheet 手感。

### P1-4 编辑器移动导航独立化

- **现状**：移动端复用桌面 `EditorSidebar`（284px）塞进 Sheet。
- **方案**：为移动端提供**精简导航**——底部/顶部仅"小说切换 + 新对话 + 会话列表 + 记忆"，次要项（批量、搜索、设置）收进「更多」。Story 面板已分叉（保留 `EditorStoryPanelMobile`），导航层同样应有移动专属信息优先级。
- **验收**：移动编辑器主操作（选小说 → 新对话 → 写/问）≤2 次点击可达，无需横向扫视 284px 侧栏。

---

## 五、P1 — 品牌与文案单源（对应 C-5、C-8、C-10）

### P1-5 统一品牌名

- **决策点**：在 **Novel AI** 与 **Novel Agent** 间二选一（建议与域名 `novel-agent.cn` 对齐为 **Novel Agent**）。
- **方案**：全站统一版权、Wordmark、欢迎语、aria-label；`NovelAiWordmark` 重命名为中性的 `BrandWordmark`，`buildWelcomeMessage.ts:5`、`AuthShell.tsx:60` 同步。
- **验收**：grep 不再同时出现两种品牌名；登录页页脚、导航、欢迎语一致。

### P1-6 术语表 + CTA 字典

- **方案**：在 `frontend/src/i18n/locales/zh/` 建 `glossary`/`cta` 命名空间：
  - **术语表**：Agent → 统一中文（如「智能体/创作助手」二选一）；「子助手」与「子代理」统一；工作台（创作台/控制台/仪表盘）统一；书库（公共书库/作品库）统一；托管（盯防模式）统一。
  - **CTA 字典**：注册转化统一 1–2 个键（如 `cta.registerFree`「免费注册」+ `cta.tryFree`「免费试用」），删除「免费开始创作 / 免费开始 / 立即免费体验」等近义重复。
- **验收**：营销页所有 CTA 引用字典键；术语表覆盖 Agent/工作台/书库/托管四组。

---

## 六、P2 — 页面瘦身（对应 C-6、C-7、C-9）

### P2-1 营销首页区块合并

- **方案**：
  - **合并 Feasibility 对比表 + Timeline 四卡** 为单一「能力 + 适配」区块（同表异构是重复）。
  - **ScrollStory 去重**：第一幕与 Hero 同为 `orchestrate`，移动端二选一；第三幕「流式成稿」demo 正文改为与第一幕**不同**的片段，体现差异化。
  - 移动端区块顺序按「价值 → 适配 → 行动」精简，目标从 9 块降到 ~5–6 块。
- **验收**：首页移动滚动长度明显缩短；四件套每个仅一处主讲 + 一处佐证。

### P2-2 编辑器侧栏 IA 简化（接续 Phase 20 onboarding）

- **方案**：会话「搜索 + 批量」默认收起（按需展开）；小说 Kebab 与会话 Kebab 操作合并去重；底栏「记忆/设置」归入统一「更多」。
- **验收**：默认态侧栏可见交互面从 16+ 降到 ~8；高级操作渐进式呈现。

### P2-3 Dashboard 标题层级去重

- **方案**：确立「**Layout 顶栏负责标题，子页 intro 仅在需要 eyebrow/插画时出现且不重复 title**」规范；删除 Bookstore/Novels/DashboardHome 的重复 title；术语统一（「我的小说」vs「作品库」取一）。
- **验收**：任意 dashboard 子页不出现 Layout title 与页内 title 语义重复。

### P2-4 Admin 概览与导航去重

- **方案**：`AdminHomePage` 保留 6 KPI **或** `AdminQuickLinks`（与 10 项侧栏重复的快捷链建议弱化为"最近访问/待办"）；明确 Home=快照、Stats=趋势、Revenue=成本的边界文案。
- **验收**：管理员从 `/admin` 能明确"下一步去哪"，无三处重复 KPI 感知。

---

## 七、P3 — 工程收敛与文案单源（对应 C-11、C-12、C-13）

- **P3-1 空态/加载/错误单源**：建 `i18n` `states` 命名空间（`empty.*` / `loading.*` / `error.load`），统一「暂无 X」「加载 X 失败」模板；修正 `AuthLegalNotice` 在 forgot/reset 误用 `variant="login"`。
- **P3-2 删死代码**：`useGsapStoryScenes.ts`、`useGsapHeroScroll.ts`、`useGsapMarketingExtras.ts`、`ScrollReveal.tsx`、`CursorLandingFeatures.tsx` + `useCursorFeatureScroll.ts`（确认零引用后删除）。
- **P3-3 列表 memo/虚拟化补全**：编辑器消息、章节 picker、会话列表补 `React.memo` 与必要虚拟化（与 P0-2 协同）。
- **P3-4 断点规范写入 `DESIGN-TOKENS.md`**：单方向断点、禁第三断点、JS 判断单入口。

---

## 八、建议实施路线

```
迭代 1（性能止血，可独立上线）
  P0-1 弹幕移动降级 · P0-3 Ambient/Timeline/Nav 移动关 blur · P3-2 删死代码

迭代 2（编辑器流式，核心体验）
  P0-2 流式批处理 + memo + 虚拟化（分 a→e 小步）

迭代 3（品牌与文案单源）
  P1-5 品牌统一 · P1-6 术语表 + CTA 字典 · P3-1 状态文案单源

迭代 4（分离规范 + 收敛）
  P1-1 断点规范 · P1-2 ResponsiveTable · P1-3 AppSheetModal

迭代 5（瘦身）
  P2-1 首页合并 · P2-2 侧栏 IA · P2-3 Dashboard 标题 · P2-4 Admin 概览
  P1-4 编辑器移动导航（视 ROI）
```

---

## 九、验收与线上回归

### 9.1 性能验收（迭代 1–2）

1. 中端机 https://www.novel-agent.cn 首页滚动至弹幕/Timeline，Performance 面板无常驻长任务；
2. 编辑器移动端单轮长流式回复帧率稳定，React Profiler 单 chunk 重渲染节点数下降；
3. `prefers-reduced-motion` 下首页/编辑器仍正常。

### 9.2 分离/文案验收（迭代 3–5）

4. grep 全站仅一种品牌名；CTA 全部引用字典键；
5. 5 个表格页走 `ResponsiveTable`，移动/桌面文案单源；
6. Dashboard/Admin 无重复 title 与重复 KPI；
7. 首页移动区块数 ≤6，四件套不重复主讲。

### 9.3 标准回归清单（每次合并 UI 改动）

- Auth 全链：login → register → captcha → verify-email → forgot → reset；
- Dashboard 各子页顶栏 CTA 不重复；
- Editor 移动：分屏选章、折叠 Agent 过程、流式写章；
- Admin 移动：crawler 子任务、users 卡片、plans 价格；
- 深色模式：Auth / Dashboard / Editor 抽样。

---

## 十、范围边界（勿误开）

- **不做全站 redesign / 换配色**（Phase 21 token 体系保留）。
- **不做编辑器桌面三栏 → 单栏产品级改版**。
- **不引入 SSR**（当前 CSR，移动判断已无 hydration 风险）。
- Playwright E2E 仍属可单独立项，本方案以现有 vitest smoke + 手动回归覆盖。
