# Novel Agent 前端 UI 批判性审查报告

> **审查日期**：2026-06-12  
> **Remediation 状态**：2026-06-12 — Phase 1–12 已落地，详见 `docs/plans/2026-06-12-frontend-phase2.md`（含 Phase 12 移动跨卷/卷序排序）。  
> **审查范围**：`frontend/src` 全部路由页面、布局壳层、业务组件与 UI 原语  
> **审查立场**：纯批判性审阅，不提供修改方案  
> **审查依据**：源码结构与组件实现（未含运行时截图或真机走查）

---

## 一、全局架构：三套皮肤、四种 Modal、五种按钮

这不是「有设计系统」，而是**多套视觉语言强行共存**：

| 体系 | 出现位置 | 问题 |
|------|----------|------|
| Tailwind + `mkt-*` 营销风 | 首页、子页 Hero | 与 dashboard 的 `AppShell*` 是两套产品 |
| styled-components `cursorLanding` | 首页滚动分镜 | 与相邻 Tailwind section 的 padding / max-width 不一致，滚动时节奏「跳帧」 |
| styled-components `editorTheme` | 编辑器全页 | 与 Admin/Dashboard 的 shadcn 完全分裂 |
| 遗留 neumorphic `login/**` | **零引用** | 死代码躺在仓库里，随时可能被误接回去 |

**Modal 至少四套**：shadcn `Dialog` / `Sheet`、`AppDialog`、`EditorSettingsModal` 自定义 overlay、`confirmAction` 全局确认。用户在不同页面点「确认」，面对的交互壳层各不相同——这不是「细节差异」，是**产品成熟度不够**的表现。

**按钮圆角**在 `rounded-full`、`rounded-xl`、`rounded-lg` 之间随意切换；**高度**在 `h-10`、`h-11`、`py-2.5`、`py-3`、`py-3.5`、`h-12` 之间无规律。同一产品里，用户会 subconsciously 觉得「这些按钮不是一家人」。

**品牌名**：导航是 **Novel AI**，Footer 是 **Novel Agent**——连名字都统一不了，还谈什么品牌感？

**断点**：Admin 用 `md`（768px），Editor 用 `767px`。差 1px 的断点策略，说明 responsive 是各模块各自为政，没有全局规范。

---

## 二、营销页面

### 2.1 `HomePage`（首页）

**`HomeHeroSection`**

- `min-h-[100vh]` 还要塞 demo mock + scroll hint，首屏被拉得 absurdly 长；CTA 很可能在 fold 以下——**最重要的转化按钮，却可能被用户永远看不到**。
- 双 CTA 居中堆在 subtitle 下，trust pills 又占一行；信息层级虽清晰，但**垂直空间浪费**严重。
- Demo 内嵌 Agent UI mock，小屏没有任何 scale 策略，可读性存疑。

**`HomeFeasibilitySection`**

- 对比表 `min-w-[520px]` 强制横滑，**没有任何 scroll affordance**——移动端用户只会觉得「页面坏了」。
- Section H2 用 `lg:text-[2.75rem]`，后面 Story 段 H2 反而更小——**叙事中段标题比前段还小**，层级倒置，像排版事故。
- 三列 persona 卡 hover ring 颜色各异（violet/emerald/amber），装饰过度，像 demo 页而非产品页。

**`HomeScrollStory` + `MarketingChatScene`**

- Intro H2 比 Feasibility 还小——**故事段被视觉降级**，与内容重要性不符。
- 900px 以下 copy 居中、list 左对齐——块居中、字左对齐，**对齐逻辑自相矛盾**。
- styled-components 段落 `4.5rem 1.5rem` padding，相邻 Tailwind section `py-20`——垂直 rhythm 不匀，长页滚动时有「忽紧忽松」感。
- 桌面 alternating 左右布局，移动全居中——**刻意设计的节奏在移动端完全丢失**。

**`HomeTimelineSection`**

- 移动端卡片全宽堆叠，中央竖线 + 圆点仍在——**alternating 语义消失，中线变成无意义的装饰**。
- `viewport once: false` 导致反复滚动重播 blur/slide——**干扰阅读**，像为了炫动画而炫。

**`HomeDanmakuSection`**

- 发送按钮 `rounded-xl`，全站其他 CTA 多为 `rounded-full`——**形状不统一**。
- 228px 固定高度 + 4 轨道，小屏长文案 truncate 感强。
- 左右 fade mask `w-24 sm:w-32` 占屏比例过大。
- 深色区底部紧贴 Footer `-mt-16` 紫色 CTA 带——**色带变化过于密集**，像强行拼接。

**`HomeFooterSection`（full variant）**

- 品牌写 Novel **Agent**，与 Nav 的 Novel **AI** 冲突。
- `accountLinks` 硬编码「创作台」，其余走 i18n——**国际化半成品**。
- `-mt-16` 侵入 Danmaku 区，小屏 CTA 带可能「压」在弹幕视觉延伸上。

**未挂载但存在的区块**

- `HomeFeaturesSection`、`HomeCapabilitiesSection` 后者 id 与 Timeline 的 `capabilities` **冲突**——若将来同时挂载会直接炸锚点。

---

### 2.2 `GuidePage`（使用指南）

- **唯一**在 Hero 放 CTA 的子页——转化路径与其他子页不对等。
- 移动端 TOC **完全隐藏**，侧栏 suitability 卡片 DOM 顺序在步骤之前——用户先看到「适合谁」再看到 Step 01，**步骤导航逻辑反直觉**。
- `scroll-mt-28` 与其他 section 的 `scroll-mt-16` 不一致——锚点跳转留白混乱。
- Step 卡片与 About values 卡视觉语言高度相似——连续浏览**重复感强**，像同一模板复制粘贴。

---

### 2.3 `PricingPage`（定价）

- Hero **无 CTA**，仅 subtitle 内嵌链接——与 Guide 不对等，**转化意愿表达最弱的一页**。
- Highlight 卡 `scale-[1.03]` + `md:-my-3`，单列移动端仍放大——**中间卡突兀/阴影溢出**，像 bug。
- Skeleton 固定 `h-[440px]`——与实际卡高可能不符，**加载时 layout shift**。
- 唯一大量使用 shadcn `Button` + `rounded-xl` 的营销区——**像从 dashboard 借来的组件**，与全站 Link + Tailwind CTA 格格不入。
- 定价卡 `rounded-3xl`，Guide 步骤 `rounded-2xl`——子页圆角不统一。

---

### 2.4 `AboutPage`（关于）

- Hero 无 CTA，转化只在页底——**读完全文才遇到按钮**，漏斗设计懒惰。
- 深色 Hero 仅此页——从 Pricing（全浅色）点 About，**色调跳跃剧烈**。
- 页底按钮 `py-2.5`，Guide Hero `py-3`——**同优先级 CTA 高度不一致**。
- Metrics 三项 wrap 时 `gap-8` 过松，窄屏 2+1 排列 awkward。

---

### 2.5 `GenericContentPage`（隐私/协议/联系）

- Eyebrow / subtitle **硬编码中文**，未走 i18n——与 Guide/Pricing/About **国际化策略分裂**。
- 负 margin 卡片叠进 Hero——极窄屏 Hero subtitle 与卡片顶边距过小。
- `max-w-3xl` 比 Guide 主内容窄——法律长文 OK，但视觉权重偏轻，像附属页。

---

### 2.6 路由重定向页

- `/features` → `/guide`、`/testimonials` → `/about`：旧路由被粗暴 redirect，**无独立页面**，若外链仍指向旧 URL，用户只会感到「页面被合并了」，SEO 与信息架构未做迁移说明。

---

### 2.7 营销共享组件

**`MarketingNav`**

- 非首页不显示「可行性/演示」锚点，但子页文案链到 `/#feasibility`——nav 与内容链接策略不一致。
- 首页顶栏初始透明，长标题可能与 nav 重叠——**对比度依赖内容位置**，不可靠。

**`MarketingSubpageHero`**

- `md:items-end` 使 action 与标题底对齐；移动 action 左对齐，与 centered 内容区**无对齐关系**。
- 三 variant（light/soft/dark）有区分，但 About 深色 Hero 孤立，像特殊待遇而非体系。

**`MarketingShell` / `MarketingPageLayout` / `MarketingMain`**

- 首页 Footer `full`（含 CTA 带），子页 `linksOnly`——**子页读完无底部转化带**，漏斗断裂。

**`MarketingAmbient` / `marketing-effects.css`**

- `mkt-card-lift` hover `-8px`——触摸设备无 hover，**纯桌面装饰**，移动端零价值。

**`HomeFooterSection`**

- 见上文品牌名、硬编码、CTA 带缺失问题。

**`DanmakuMarquee` / `MarketingHeroDemo` / `MarketingChatOrchestrationDemo` 等 demo 组件**

- 为营销服务，动画与真实产品 UI 混用——用户进产品后期望落差风险高。

**`CursorHeroStack` / `useGsapStoryScenes` / GSAP 相关**

- 与 Tailwind section 双轨——维护成本高，视觉节奏难统一。

**`MarketingSubpageHero` / `MarketingPageWrapper` / `NovelAiWordmark`**

- Wordmark 在 Nav、Auth、Footer 多处出现，尺寸与上下文不统一时**品牌识别被稀释**。

---

## 三、认证页面

### 3.1 `LoginPage`

- 结构最简，但「忘记密码？」链到 `/contact`——**文案与行为严重不符**，像临时占位从未改。
- 全 toast 无字段级错误——2 字段尚可，但 session_expired 也无表单内持久提示。
- 密码 hint 位「忘记密码？」`text-[10px]`——**触控目标远低于 44px 推荐值**。

### 3.2 `RegisterPage`

- 按钮写「注册并登录」，成功后却 `navigate('/login')`——**文案撒谎**。
- `sm:grid-cols-2` 在 `max-w-[400px]` 卡内启用——每列约 180px，**英文 placeholder 与中文 label 拥挤**，640px 就双列是 responsive 设计失误。
- 验证码行未复用 `AuthField`——label/hint 结构与 AuthField 微差，**重复 markup**。
- 「获取验证码」`h-10 text-xs`，下方 `AuthSubmitButton` `h-11`——**又不一致**。
- 成功提示 `text-[10px]` 无 dark 变体。
- 注册关闭时 footer 与 legal 隐藏——关闭态信息密度过低。

### 3.3 `VerifyEmailPage`

- **完全不是 Login/Register 页面族**：无左栏营销、无 Wordmark、无 AuthLegalNotice——从邮件链接进入，**视觉上下文断裂**。
- 用 shadcn `Button h-10 rounded-xl`，非 `AuthSubmitButton`——**CTA 体系再次分裂**。
- 失败态同时「返回登录」和「打开账户设置」——后者对未登录用户**语义可疑**。
- loading 用 `InlineBrandLoader`，与 auth 的 `AuthSpinner` 又是不同 loader 体系。

### 3.4 认证组件

**`AuthShell`**

- 表单卡 `bg-white/92` 硬编码——深色模式下**白块浮在深色背景**，与 `AuthResultCard` 的 `bg-surface` 不一致。
- 登录/注册 marketing footer：登录用 pill 标签，注册用 ✓ 列表——**同一壳下形态不统一**。

**`AuthField` + `authFieldClass`**

- `authFieldClass` 定义 `h-11`，`AuthField` 覆盖为 `h-10`——**定义与使用自相矛盾**。
- 主按钮 `h-11` 比输入框高 4px——**视觉基线不齐**，像没做过对齐检查。

**`AuthSubmitButton`**

- 仅 Login/Register 使用，VerifyEmail 不用——**组件存在意义被削弱**。

**`AuthLegalNotice`**

- `text-[11px]` 链接在段落内——触控面积过小。

**`AuthResultCard`**

- 与 AuthShell 共享 `mkt-form-card` 类，但壳层结构不同——**表面相似、骨架不同**。

**`SliderCaptchaModal`**

- 取消/换一张右对齐小按钮，与表单全宽 CTA 模式不同——模态内可接受，但**无 safe-area**，iPhone 底部可能被遮挡。
- `statusLabel` truncate——长错误信息被截断，移动端用户看不到完整原因。

**`login/input/Input.tsx`、`login/button/Button.tsx`**

- Neumorphic 风格，**零引用**——技术债，与现行 Tailwind auth 完全两套语言。

---

## 四、Dashboard（用户创作台）

### 4.1 `DashboardLayout`

- Header 标题与页面内二次标题（如首页 Hero）**双层叙事**，略重复。
- `PAGE_META` 与页面内 intro 职责重叠——信息架构不清晰。

### 4.2 `DashboardHomePage`

- Hero 内双按钮 + Header QuickActions + 最近编辑行内「继续写作」——**「进入编辑器」CTA 三重重复**，像怕用户找不到。
- `AppShellCard` 包 `ActivityHeatmap`，Heatmap 内又有 shadcn `Card` + 自己的 header——**双边框/双 header**，视觉冗余到可笑。
- KPI `grid-cols-2` 窄屏四字标签 + `text-2xl` 数值——**拥挤**。

### 4.3 `NovelsPage`

- 「继续写作」链到 `/editor` 无 ID，首页最近编辑却带 `lastChapterId`——**同功能行为不一致**，像两个团队各写各的。
- Intro loading 时 title 用 `InlineBrandLoader`——**布局高度可能抖动**。
- 与 Bookstore 卡片结构高度相似但信息字段不对齐——**复用半成品**。

### 4.4 `BookstorePage`

- Intro **无 action 按钮**，Novels 有「新建小说」——**页面顶部右侧空白**，视觉不平衡。
- 「去作品库」在已在书库页时——**文案语义错误**。
- API 失败仅 toast，UI 仍显示空书库——**错误态与空态无法区分**。
- 无分页/搜索，固定 50 条——**功能完整性存疑**。

### 4.5 `BillingPage`

- 无事件且无 runFilter 时第三块明细表**整表隐藏**——用户可能不知道有明细功能。
- Loading 不统一：第一卡 spinner 文案，第二卡 Skeleton，第三卡不出现——**三种 loading 语言**。
- 与 Settings「订阅与用量」**信息重复**——同一数据两处展示，维护噩梦。

### 4.6 `SettingsPage`

- 整页 loading 用 `ContentPending`，其他页多局部 skeleton——**策略不统一**。
- 无 `AppPageIntro`，依赖 Layout Header——与 Novels/Bookstore **页面风格分裂**。
- 侧栏 Nav `/dashboard/settings`、底栏 Modal、全页 Settings——**三入口行为不一致**（Modal vs 全页）。

### 4.7 Dashboard 组件

**`AppSidebar`**

- 「账户设置」三路径问题见上；未验证邮箱 amber 与 `DashboardAnnouncementBanner` amber **语义未区分**。

**`DashboardHeader` / `AppShellHeader`**

- `h-16` 与两行 description 并存时，**实际高度可能超过 16**，与侧栏 Logo 区对齐不完美。

**`DashboardQuickActions`**

- `rounded-lg`，页面 CTA 多 `rounded-xl`——**又不统一**。
- 「进入编辑器」与首页 Hero 重复。

**`MobileSidebarDrawer`**

- 宽 `min(100vw-2rem, 16rem)` 略窄于桌面 `w-56`——**刻意缩小移动体验**？

**`DashboardAnnouncementBanner`**

- 与未验证邮箱共用 amber——**警告类型视觉混淆**。

**`AccountSettingsPanel` / `AccountSettingsModal`**

- Modal 不含订阅块，全页多一块——**体验分裂**。
- 长邮箱 `max-w-[60%] truncate` 截断过多。

**`ActivityHeatmap`**

- 不应再外包 `AppShellCard`；标题重复；小屏 heatmap 需横滚——**嵌套错误 + 移动不友好**。

**`CoverGenerateDialog` / `CoverImageGeneratingOverlay`**

- 与 Novels 卡片配合尚可——相对少数做得连贯的模块。

**`AppPageStack` / `AppShellCard` / `AppStatCard` / `AppEmptyState`**

- 内容宽度：首页满 1440px vs 小说/书库 6xl vs 账单/设置 3xl——**路由切换时栏宽跳跃**，像在不同产品间跳转。

**`DataTableFrame`**

- 仅 `overflow-x-auto`，无移动端卡片 fallback——**Admin 表格页的 mobile 灾难根源**。

---

## 五、Admin（管理后台）

### 5.1 `AdminLayout`

- `<640px` 顶栏隐藏「返回用户端」——**只能走窄抽屉底部**，顶栏 escape 路径缺失。
- `MobileAdminDrawer` 宽 `min(100vw-2rem, 14rem)`——**10 项导航 + 返回，矮屏需滚动**，抽屉偏窄。

### 5.2 各 Admin 页面

**`AdminHomePage`**

- 6 张 KPI，无趋势、无 drill-down——**与 Stats/Revenue 功能重叠**，概览页像占位符。
- 无页面级操作——**看完不知道下一步去哪**。

**`UsersPage`**

- 搜索需点「搜索」才触发，无 debounce——**2010 年的交互**。
- 分页始终显示（即使 1 页），与 AuditLog 不一致。
- 表格 6 列移动端**必须横滑**，编辑仅 icon 按钮——可发现性一般。

**`StatsPage`**

- 固定 30 日，无日期范围/导出——**分析能力贫弱**。
- 注册趋势空时只剩一张 Agent 图——**空态 awkward**。

**`CrawlerPage`**

- **信息密度最高**的 Admin 页：双列变单列后**页面 absurdly 长**。
- 决策日志 `h-[min(36vh,320px)]` 小屏占屏比过大。
- 行内 4 个 icon 按钮 + 标题/进度/错误——**单行信息过载**。
- 目标 textarea `rows={2}`——长目标编辑不便。
- 子任务硬限 50 条、无分页；错误 truncate 80 字——**运维信息被截断**。

**`CatalogPage`**

- 薄包装，逻辑全在 `CatalogAdminPanel`——页面本身无额外 context。

**`PlansPage`**

- 表 `min-w-[880px]`——**移动端几乎不可用**。
- 月价单位是「分」——**运营易错**，UI 未做人性化展示。
- Dialog 内 `grid-cols-2` 窄屏挤——**表单 responsive 欠考虑**。

**`RevenuePage`**

- MRR hint 长订阅摘要小屏易溢出，无 truncate。
- 饼图 `label={name}` 模型名多时**标签重叠**——图表可读性灾难。

**`SiteContentPage`**

- 移动侧栏列表堆顶，无 tab 折叠——**占垂直空间**。
- header action「预览/编辑/保存」与标题同行——窄屏 `AppShellCardHeader` **堆叠 awkward**。
- 切换页面 key 无未保存提示——**数据丢失风险**。

**`AuditLogPage`**

- 变更列 `text-[10px]` + truncate 120——**几乎不可读**。
- 无详情 Modal 展开完整 JSON——**审计页却审不清**。
- 仅 actorId 数字过滤，无用户名——**筛选能力可笑**。
- 分页仅在 `totalPages > 1` 时显示——与 Users 不一致。

**`SystemSettingsPage`**

- 「保存参数」非 sticky——长列表需滚回底部——**操作路径长**。
- 全量提交无 diff 预览——**误改风险**。
- 相对是 Admin 里最「表单友好」的页——**矮子里拔将军**。

### 5.3 Admin 组件

**`AdminSidebar`**

- 10 项 nav，nav 区可能溢出——**无显式 overflow 策略**。

**`UserTable`**

- 无 responsive 列隐藏——**移动端全靠横滑**。

**`UserEditDialog`**

- Dialog + 嵌套 Sheet——**层级深**，billing tab 操作分散，账号保存后关 Dialog、订阅保存不关——**行为不一致**。

**`CatalogAdminPanel`**

- 操作按钮桌面 hover 才显、移动常显——**窄屏一行 3 按钮 + 删除 icon 拥挤**。
- 分页居中，与 Users 风格不同。

**`CatalogOverviewDialog` / `CatalogReaderModal`**

- Reader 移动目录 `max-h-[40vh]` 在上、正文在下——**上下文割裂**，需大量滚动切换。

**`CrawlJobRow` / `CrawlJobDetailModal`**

- Modal 无 footer 操作——**详情页不能控任务**，操作仍在行上，详情页价值存疑。

**`OrchestratorLogTerminal` / `CrawlLogTerminal`**

- 终端风 `text-xs`，手机占屏过大——**监控 UI 当移动页用**。

**`StatsTrendCharts` / `RevenueCharts`**

- Recharts 配置未考虑小屏 label 密度。

**`crawlJobUi.ts`**

- 爬虫 UI 常量与页面耦合——样式/token 未纳入统一设计体系。

---

## 六、Editor（编辑器）

### 6.1 `EditorPage`

- 三栏语义 + 多个 modal 同时挂载——**复杂度高**，新手学习曲线陡。
- 767px 与 Admin 768px 差 1px——**断点分裂**。

### 6.2 Editor 组件

**`EditorPageLayout`**

- 主区 `margin-left: 284px`，767 以下归零——OK，但与 Admin layout 完全两套实现。

**`EditorSidebar` / `EditorMobileNav`**

- 移动侧栏仅 drawer；wrapper `onClick` 关 drawer——**可能误触关闭**。
- 小说树 → 会话 → 搜索 → batch → kebab → memory/settings——**信息密度过高**。

**`EditorCenterTabs`**

- Chat / 章节编辑互斥——**移动唯一切换主视图**，无分屏。

**`EditorChatPanel` / `EditorChatMessageList`**

- 消息 max-width 768px 居中——OK；Composer 浮动 + safe inset——相对合理。
- 单条 assistant 消息可占多屏——**timeline 移动灾难**。

**`EditorStoryPanel`**

- 移动写章节：drawer 选小说 → 切 story tab → outline overlay 选章 → 编辑——**路径 absurdly 长**。
- Toolbar `flex-wrap`，标题独占一行——**移动工具栏占屏过多**。

**`EditorSettingsModal`**

- 自定义 overlay max 440px——**非 shadcn**，与 Admin Dialog 又一套。

**`EditorSessionDialogs`**

- `AppDialog`——与 `confirmAction` 又一套。

**`NovelOutlinePanel` / `ChapterVersionPanel` / `ChapterInlineDiff`**

- Diff 信息密度高，桌面向；移动 outline overlay `min(280px, 88vw)`——**选章体验笨重**。

**`CreateNovelModal`**

- 创建流程 modal——与 editor 其他 modal 体系叠加。

**`EditorChatMessage` / `NovelSessionList`**

- 会话列表与消息渲染嵌套深——**侧栏 scroll 与主区 scroll 竞争**。

**`EditorStoryPanel` / `icons.tsx`**

- styled-components 体系，与 dashboard icon 用法不一致。

---

## 七、Agent 组件（`components/agent/**`）

**`AssistantStreamTimeline`**

- 流式消息主时间线；编排层 + 工具行 + 文本块；折叠逻辑复杂——**单条消息可占多屏**。

**`OrchestrationLayer` / `OrchestrationStreamBody`**

- 思考/工具/正文外层；流结束后自动收起——**新用户会迷失**。

**`AgentThinkPanel`**

- 思考 Markdown 折叠；嵌套在编排内——**层级过深**。

**`AskUserForm`**

- 多步 wizard；choice 按钮小屏纵向很长——**表单未做 compact 策略**。

**`ContextUsageBar`**

- Composer 内多行 meta——**信息过载**。

**`AgentMarkdown`**

- SiteContent 预览复用——跨场景 OK，但与 editor 内 markdown 样式是否一致存疑。

**`SubagentDetailModal` / `TodoDetailModal`**

- 自定义全屏 overlay——**又一套 modal**。

**`SubagentPanel` / `SubagentTimelineContent`**

- 子 agent 详情嵌套——调试向信息暴露给普通用户的风险。

**`ToolDetailPeek` / `CcToolRow` / `ScrollableToolExcerpt`**

- 高密度 monospace/args——**开发者向**，普通用户可读性存疑。

**`TimelineToolBlock` / `TimelineDeliveryBlock` / `TimelineLeadIcon` / `ToolStatusDot`**

- timeline 子块嵌套深——**认知负荷高**。

**`PlanningStack` / `TimelineTodoList`**

- 规划与 todo 展示——折叠/展开状态多，可发现性依赖习惯。

**`StreamingRevealContent` / `StaggeredChoices`**

- 动画向——与 reduced-motion 策略是否全局一致存疑。

**`GlobalAgentTracePanel`**

- 调试向——**产品边界模糊**。

**`timelineUtils.ts`**

- 工具函数与 UI 耦合——timeline 行为难以单独验收。

---

## 八、Chat / Novel / Loaders / Motion

### 8.1 Chat（`components/chat/**`）

**`ChatComposer`**

- Editor 核心输入，与 `ContextUsageBar`、safe inset 耦合——**组件职责重**。

**`UserChatBubble`**

- 用户消息气泡——与 agent timeline 视觉权重是否平衡存疑——**双轨消息渲染**风险。

### 8.2 Novel（`components/novel/**`）

**`NovelOutlinePanel` / `OutlineVolumeBlock` / `outlineIcons.tsx` / `outlineStyles.ts` / `outlineDrag.ts`**

- 大纲 drag、卷块——桌面 OK，移动 overlay 内操作**触控目标与 drag 冲突**风险。

**`CreateNovelModal`**

- 创建流程 modal——与 editor 其他 modal 体系叠加。

**`ChapterVersionPanel`**

- 版本历史 UI——信息密度高，移动未优化。

### 8.3 Loaders（`components/loaders/**` + `loading/**`）

**`BrandLoader` / `InlineBrandLoader` / `NovelAiCubeLoader` / `ThinkingHandLoader`**

- **至少三种 loader 视觉**——auth、dashboard、verify 各用不同套，品牌加载体验分裂。

**`ShimmerScanBar` / `ShimmerScanText` / `ShimmerScanOverlay` / `ShimmerScanGraphic` / `ShimmerScanTextCluster` / `StreamingPencilCursor`**

- 营销/编辑器扫光效果——装饰性强，是否与 `prefers-reduced-motion` 全局一致存疑。

**`ContentPending` / `LayoutOutletSkeleton` / `PageSkeletons` / `RouteFallbackShell` / `InstantShell` / `RouteShellSuspense`**

- 多种 pending 策略——Settings 整页 ContentPending vs 其他页局部 skeleton——**不统一**。

**`RouteProgressBar`**

- 路由进度条——与其他 loading 指示**关系不明**。

**`prefetchRouteShells.ts`**

- 性能优化存在，但 skeleton 与真实内容 layout 是否匹配未统一验证。

### 8.4 Motion（`components/motion/**`）

**`MotionPane` / `MotionMorph` / `MotionTabBar` / `MotionSegmentRail` / `MotionPop`**

- framer-motion 封装——与 `PageTransition`、marketing GSAP **三套动画体系**并存。

### 8.5 路由与守卫

**`PageTransition`**

- 仅非 app shell 路由使用——marketing 有 fade，dashboard/admin/editor 无——**跨区跳转节奏断裂**。

**`RouteErrorBoundary`**

- 错误页样式若与 marketing/dashboard 不一致——**孤岛页**。

**`RequireAuth` / `RequireAdmin`**

- 守卫 redirect 目标页 UI 是否友好未在本审查验证。

---

## 九、UI 原语（`components/ui/**`）

**`button.tsx`**

- shadcn 默认——Marketing 多数不用，Pricing/VerifyEmail 用——**采用率分裂**。

**`AppDialog` vs `dialog.tsx`**

- 两套 Dialog——Editor Session 用 AppDialog，Admin 用 shadcn Dialog——**为什么有两套？**

**`ConfirmDialogHost`**

- 全局 confirm——与 inline Dialog confirm **双轨**。

**`AppToastHost`**

- 全站 toast——Register 等长表单**全靠 toast 报错**，字段级错误为零——**表单 UX 偷懒**。

**`KebabMenu` / `DropdownSelect` / `select.tsx` / `dropdown-menu.tsx`**

- Audit 用原生 `<select>`，其他用 shadcn——**表单控件风格分裂**。

**`EditorButton`**

- 编辑器专用按钮——与 `button.tsx` again 分裂。

**`NeumorphicSwitch` / `switch.tsx`**

- 两套 Switch——**又一个双轨**。

**`table.tsx` / `card.tsx` / `input.tsx` / `skeleton.tsx` / `avatar.tsx` / `badge.tsx` / `sheet.tsx` / `separator.tsx`**

- shadcn 标准件——Admin/Dashboard 用；Editor/Marketing 大量 bypass——**设计系统名存实亡**。

---

## 十、Layout 与共享壳

**`AppShellMain`**

- max-w 1440px + 渐变底——OK，但子页 max-width 策略不统一，**壳层宽、内容窄，留白策略混乱**。

**`AppShellHeader`**

- 见 Dashboard/Admin 各问题。

**`AppPageStack`**

- narrow/wide/default 三档——**无文档说明何时用哪档**，导致各页随意选择。

**`DataTableFrame`**

- 见上文——**移动端灾难放大器**。

---

## 十一、跨页面一致性：汇总批判

| 维度 | 批判 |
|------|------|
| **CTA 形状** | full / xl / lg 混用，Marketing / Dashboard / Auth 各一套 |
| **CTA 高度** | h-10 / h-11 / h-12 / py-* 无 token |
| **内容宽度** | 6xl / 5xl / 4xl / 3xl / 1120px / 1440px 混用 |
| **Footer** | 首页 full CTA 带 vs 子页 linksOnly |
| **品牌** | Novel AI vs Novel Agent |
| **i18n** | GenericContent + Footer 硬编码中文 |
| **Modal** | ≥4 套 |
| **Loader** | ≥3 套 |
| **Animation** | GSAP / framer / CSS 三套 |
| **表格移动** | Admin 表格页几乎不可用 |
| **设置入口** | Nav / Modal / 全页三路径 |
| **Editor 移动** | 写章节路径过长 |
| **amber 语义** | 未验证邮箱 / 公告 / 配额警告未区分 |
| **分页/筛选** | Users vs Audit 模式不一致 |
| **错误反馈** | toast-only vs inline 混用 |
| **死代码** | login/** 零引用 |

---

## 十二、移动端问题优先级（按严重程度）

### 灾难级

1. Admin 表格页（Users / Plans / Audit）横滑无 fallback
2. Register 400px 卡内 sm 双列
3. Feasibility 对比表无 scroll 提示
4. Editor 移动写作路径（drawer → tab → overlay → 选章）

### 严重级

5. Guide 移动无 TOC，suitability 顺序反直觉
6. Hero 首屏过高，CTA 可能在 fold 下
7. Pricing highlight 卡移动 scale 突兀
8. Crawler 页移动过长、行内按钮过密
9. Auth 链接触控面积过小（10–11px）

### 中等级

10. Timeline 移动中线冗余
11. 子页无 Footer CTA 带
12. VerifyEmail 与 AuthShell 视觉断裂
13. Dashboard 内容宽度路由间跳跃
14. ActivityHeatmap 双 Card 嵌套

---

## 十三、页面与组件索引

### 路由页面（`frontend/src/pages/`）

| 路径 | 文件 | 所属区域 |
|------|------|----------|
| `/` | `HomePage.tsx` | 营销 |
| `/guide` | `GuidePage.tsx` | 营销 |
| `/pricing` | `PricingPage.tsx` | 营销 |
| `/about` | `AboutPage.tsx` | 营销 |
| `/privacy` `/terms` `/contact` | `GenericContentPage.tsx` | 营销 |
| `/login` | `LoginPage.tsx` | 认证 |
| `/register` | `RegisterPage.tsx` | 认证 |
| `/verify-email` | `VerifyEmailPage.tsx` | 认证 |
| `/editor/:chapterId?` | `EditorPage.tsx` | 编辑器 |
| `/dashboard` | `DashboardHomePage.tsx` | 创作台 |
| `/dashboard/novels` | `NovelsPage.tsx` | 创作台 |
| `/dashboard/bookstore` | `BookstorePage.tsx` | 创作台 |
| `/dashboard/billing` | `BillingPage.tsx` | 创作台 |
| `/dashboard/settings` | `SettingsPage.tsx` | 创作台 |
| `/admin` | `AdminHomePage.tsx` | 管理 |
| `/admin/users` | `UsersPage.tsx` | 管理 |
| `/admin/stats` | `StatsPage.tsx` | 管理 |
| `/admin/crawler` | `CrawlerPage.tsx` | 管理 |
| `/admin/catalog` | `CatalogPage.tsx` | 管理 |
| `/admin/plans` | `PlansPage.tsx` | 管理 |
| `/admin/revenue` | `RevenuePage.tsx` | 管理 |
| `/admin/site-content` | `SiteContentPage.tsx` | 管理 |
| `/admin/audit-log` | `AuditLogPage.tsx` | 管理 |
| `/admin/system-settings` | `SystemSettingsPage.tsx` | 管理 |

### 布局（`frontend/src/layouts/`）

- `DashboardLayout.tsx`
- `AdminLayout.tsx`

### 组件目录（`frontend/src/components/`）

| 目录 | 主要职责 |
|------|----------|
| `admin/` | 管理后台侧栏、表格、爬虫、书库、图表 |
| `agent/` | Agent 流式时间线、编排、工具展示、AskUser |
| `auth/` | 登录注册壳、表单、验证码 |
| `chat/` | 聊天输入、用户气泡 |
| `dashboard/` | 创作台侧栏、Header、热力图、封面生成 |
| `editor/` | 编辑器三栏、会话、章节、设置 |
| `guards/` | 路由鉴权守卫 |
| `layout/` | AppShell、PageStack、DataTableFrame |
| `loaders/` | 品牌与扫光加载动画 |
| `loading/` | 路由级 skeleton、ContentPending |
| `login/` | **遗留** neumorphic 输入/按钮（未使用） |
| `marketing/` | 营销 Nav、Hero、滚动分镜、Footer |
| `memory/` | Story Memory 常量 |
| `motion/` | framer-motion 封装 |
| `novel/` | 大纲、版本、创建小说 |
| `ui/` | shadcn 原语、AppDialog、Toast、Confirm |

---

## 十四、结论

这套前端不是「有一个设计系统需要微调」，而是**多个时期、多个子系统拼接的产物**：营销 Tailwind、滚动分镜 styled-components、Dashboard/AppShell shadcn、Editor 独立 theme、Auth 半套 marketing 类、遗留 neumorphic 死代码、四套 Modal、三种 Loader、三种动画栈。

页面级问题从 **品牌名不一致**、**CTA 形状高度随意**，到 **移动端表格几乎不可用**、**Editor 写章节路径 absurdly 长**，再到 **信息架构重复**（三处设置入口、双层 KPI 与 Stats 重叠、Billing 与 Settings 订阅重复）——**不是局部排版问题，是产品 UI 缺乏统一治理的结果**。

组件级问题从 **`AuthField` 高度定义与使用矛盾**，到 **`ActivityHeatmap` 双 Card 套娃**，到 **Audit 变更列 10px 不可读**——**大量组件像「能跑就行」堆上去，未经过系统性视觉与交互验收**。

若要以「每个页面、每个组件都经得起审查」为标准，**当前状态远未达标**；用户在不同路由间跳转，会在宽度、圆角、按钮、Modal、Loader、品牌名之间不断感受到**这不是一个产品，而是多个产品缝在一起**。

---

## 附录：关键文件路径

```
frontend/src/App.tsx                          # 路由树
frontend/src/layouts/DashboardLayout.tsx
frontend/src/layouts/AdminLayout.tsx
frontend/src/styles/marketing-effects.css
frontend/src/styles/theme.ts
frontend/src/components/layout/AppPageStack.tsx
frontend/src/components/layout/AppShellHeader.tsx
frontend/src/components/layout/AppShellMain.tsx
frontend/src/components/layout/DataTableFrame.tsx
```
