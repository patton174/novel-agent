# Novel Agent 前端 UI 二次验收审查报告

> **审查日期**：2026-06-12（优化后复验）  
> **Remediation 跟进**：Phase 16（2026-06-12）已针对 §3 可代码化项修复，见 [`plans/2026-06-12-frontend-phase2.md`](plans/2026-06-12-frontend-phase2.md)  
> **对照文档**：[`frontend-ui-audit.md`](frontend-ui-audit.md)、[`plans/2026-06-12-frontend-phase2.md`](plans/2026-06-12-frontend-phase2.md)  
> **审查立场**：验证 Phase 1–15 声称的闭环是否属实，并对**仍不合理**之处继续批判  
> **审查依据**：当前 `frontend/src` 源码（未含线上截图走查）

---

## 一、总体结论

上一轮审查的核心诊断是：**多套视觉语言、Modal/Loader 分裂、Admin 移动不可用、Editor 移动路径过长、品牌不统一**。  
经过 Phase 1–15 后，**工程债层面确有实质性收敛**——`styled-components` 已从 `frontend/src` 剔除，`login/**` 死代码删除，Admin 主要表格页具备移动卡片双轨，Editor 移动写作路径从「drawer → tab → overlay → 选章」改为顶栏分屏选章 + 自动首章，Agent 历史消息在移动端默认折叠创作过程。

但「全部闭环、无 backlog」这一表述**仍偏乐观**。当前状态更准确的说法是：

> **骨架已统一，营销与创作台仍是两套 CTA 方言；Admin 运维页信息密度依然过高；部分产品语义问题被文案掩盖而非消除。**

产品从「多个产品缝在一起」升级为「**同一产品里的两个子品牌（营销 pill CTA vs 创作台 rounded-xl）**」——进步明显，尚不足以称为设计系统成熟。

---

## 二、已验证闭环项（源码可证）

以下项在复验中**确认已落地**，原审计批判大多不再成立。

| 原问题 | 验证结果 | 关键位置 |
|--------|----------|----------|
| styled-components 三套皮肤 | ✅ `frontend/src` 无 `styled-components` import | 全目录 grep 为零 |
| 遗留 neumorphic `login/**` | ✅ 目录已删 | glob 为零 |
| 断点 767/768 分裂 | ✅ `APP_MOBILE_MAX_PX = 767` + Tailwind md 注释对齐 | `lib/breakpoints.ts` |
| Auth 输入/按钮高度矛盾 | ✅ 统一 `h-11` | `authFieldClass.ts`、`AuthSubmitButton` |
| Auth 表单卡硬编码白底 | ✅ 改为 `bg-surface/95` | `AuthShell.tsx` |
| Register 400px 卡内 sm 双列 | ✅ 改为 `min-[480px]:grid-cols-2` | `RegisterPage.tsx` |
| 「注册并登录」文案撒谎 | ✅ 改为「完成注册」 | `RegisterPage.tsx` |
| 全 toast 无字段错误 | ✅ Login/Register 有 `fieldErrors` + inline | `AuthField` `error` prop |
| VerifyEmail 视觉断裂 | ✅ Wordmark + `MKT_CTA_AUTH` + 底部法律链接；失败态按登录态分支 | `VerifyEmailPage.tsx` |
| Novel AI / Novel Agent 品牌分裂 | ✅ Footer/Wordmark/i18n `t('brand')` | `HomeFooterSection.tsx` |
| Dashboard 路由宽度跳跃 | ✅ `AppShellMain` 统一 `max-w-6xl`；窄页用 `compact` 内嵌 3xl | `AppShellMain.tsx`、`AppPageStack.tsx` |
| ActivityHeatmap 双 Card 套娃 | ✅ 去掉外层重复标题；Heatmap 自管 header | `DashboardHomePage.tsx`、`ActivityHeatmap.tsx` |
| 账户设置三入口行为分裂 | ✅ 删除 Modal；侧栏头像链 `/dashboard/settings`；`AccountSettingsSections` 共享 | `AppSidebar.tsx`、`SettingsPage.tsx` |
| Users 搜索需点按钮 | ✅ 450ms debounce + 提示文案 | `UsersPage.tsx` |
| Admin 表格移动灾难 | ✅ `UserTable` / `AuditLogPage` / `PlansPage` 等 `md:hidden` 卡片 + 桌面表 | 各 admin 页 |
| Admin 移动无返回 | ✅ `<sm` icon 返回创作台 | `AdminLayout.tsx` |
| Audit 变更列不可读 | ✅ `AuditLogDetailModal` + 移动卡片「查看变更」 | `AuditLogPage.tsx` |
| Feasibility 表无横滑提示 | ✅ `md:hidden` 文案「← 左右滑动查看更多 →」 | `HomeFeasibilitySection.tsx` |
| Pricing 高亮卡移动 scale | ✅ 仅 `md:scale-[1.03]` | `PricingPage.tsx` |
| Hero demo 移动隐藏 | ✅ `max-sm:scale-[0.94]` | `HomeHeroSection.tsx` |
| Hero 首屏 absurdly 长 | ⚠️ **部分缓解**：`min-h-[min(100svh,720px)]` 等 cap，但仍含 demo + scroll hint | `HomeHeroSection.tsx` |
| Guide 移动无 TOC | ✅ 顶栏横滑步骤 pill，步骤在 suitability 之前 | `GuidePage.tsx` |
| 子页无 Footer CTA | ✅ `MarketingSubpageCtaBand` + `subpageCta` prop | `MarketingPageLayout.tsx` |
| GenericContent 硬编码中文 | ✅ i18n `generic.*` | `GenericContentPage.tsx` |
| Novels 继续写作无 novelId | ✅ 卡片链 `/editor?novelId=…` | `NovelsPage.tsx` |
| Bookstore 错误/空态不分 | ✅ `loadError` + 重试按钮 | `BookstorePage.tsx` |
| Bookstore intro 右侧空白 | ✅ action「我的作品库」 | `BookstorePage.tsx` |
| Settings 无 AppPageIntro | ✅ 已补 intro + 共享 sections | `SettingsPage.tsx` |
| HomeTimeline 移动中线冗余 | ✅ 节点 `max-md:hidden` | `HomeTimelineSection.tsx` |
| Editor 移动写作路径过长 | ✅ `StoryMobileChapterPicker` 分屏 + 自动首章 + 排序/跨卷 | `EditorStoryPanel.tsx` |
| Agent 单条占多屏 | ✅ 移动 `processCollapsed` + 交付折叠 + excerpt 行数上限 | `EditorChatMessage.tsx` 等 |
| Modal 四套并存 | ⚠️ **部分缓解**：`AppModalShell` 为主路径；`EditorModalShell.legacy` 仍导出 | `AppModalShell.tsx` |

---

## 三、仍值得批判的问题（优化后）

### 3.1 全局：CTA 方言仍未统一

Phase 文档声称 Button `rounded-xl` 统一，但**营销区仍大量 `rounded-full`**（`marketingCta.ts`、`HomeFeasibilitySection` 底部 CTA 甚至未走 token，inline 复制一份 pill 样式）。

创作台 / Admin 用 `appButtonTokens.ts`（`rounded-xl`），认证用 `MKT_CTA_AUTH`（`rounded-full`）。  
这不是「细节」，是**用户从首页点进创作台会感到按钮换了物种**——Phase 7 统一了 Novel AI 名字，却没统一 CTA 几何语言。

### 3.2 全局：Modal 单壳名不副实

`AppModalShell` 已是主路径，但 `EditorModalShell.tsx` 仍 **re-export legacy overlay**（文件头 `@deprecated Prefer AppModalShell`）。  
仓库里同时存在 `AppDialog`、`ConfirmDialogHost`、`Dialog`、`Sheet`、`AppModalShell`——比原来少一套自定义 Editor overlay，**离「单壳」仍有距离**。  
若团队内部仍可能 import legacy，则「闭环」只是文档闭环。

### 3.3 营销页

**`HomeHeroSection`**

- 首屏高度虽 cap，但 **demo + trust pills + 双 CTA + scroll hint** 堆叠仍偏满；小屏用户第一眼未必先看到 CTA。
- 对比 Phase 2C「Hero 移动可见」——demo 能看见了，**信息密度问题还在**。

**`HomeFeasibilitySection`**

- 横滑提示有了，但仍是 **`min-w-[520px]` 真表格**——只是告诉用户「请滑动」，没有改表格本身的移动可读性。
- Persona 卡三色 hover ring **依旧过度装饰**，像 landing demo 而非产品 UI。

**`HomeDanmakuSection`**

- 发送按钮仍是 **`rounded-full`**，输入框 `rounded-xl`——同一表单内形状分裂，原审计点**未改**。

**`HomeFooterSection` full variant**

- `-mt-16` 侵入 Danmaku 区的拼接策略**依旧**；子页加了 `MarketingSubpageCtaBand`，首页末尾仍是**色带密集过渡**。

**`GuidePage`**

- 移动 TOC 横滑 pill 是进步，但 **suitability 侧栏仍在 DOM `order-3`**，读完四步才看到「适合谁」——比原来好（步骤在前），但 suitability 仍像附录。

### 3.4 认证

**`LoginPage`**

- 「忘记密码？」改为「忘记密码？联系客服」+ `min-h-9`——**诚实了，但本质仍是 `/contact` 而非找回流程**；产品能力缺口用 copy 掩盖。
- `session_expired` 已有 inline 天蓝提示条——✅ 此项闭环。

**`RegisterPage`**

- 验证码按钮已 `h-11` 对齐——✅。
- 关闭注册时 footer/legal 仍隐藏——**关闭态仍像半成品页**。

**`VerifyEmailPage`**

- 与 AuthShell **仍非同一页面族**（无左栏营销），只是补了 Wordmark 与链接——**比之前好，谈不上统一**。

**`SliderCaptchaModal`**

- safe-area、长错误 truncate——**未在本次复验中看到明确改动**，移动端底部遮挡风险仍存疑。

### 3.5 Dashboard（创作台）

**`DashboardHomePage`**

- 「进入编辑器 / 继续写作」仍在 **Header QuickActions、Hero、最近编辑行** 三处出现——CTA 冗余**未收敛**。
- Hero 装饰 blur 圆 + badge + 大标题——在已统一 6xl 宽度的壳内仍显**营销化过重**，与 Admin 冷静风格反差大。

**`NovelsPage`**

- 空态 / 部分 CTA 仍链 **`/editor` 无 novelId**（L108/L137 grep）——与卡片上「继续写作」行为**仍不一致**。

**`BillingPage` vs `SettingsPage`**

- Settings 已用 `AccountSettingsSections` 共享——需确认 Billing 订阅摘要是否仍重复；若 Billing 仍单独展示套餐/token，**信息双轨维护成本还在**。

**`DashboardAnnouncementBanner` vs 未验证邮箱**

- 侧栏未验证改为 **sky** 色系——与 amber 公告区分，✅ 此项是明确改进。

### 3.6 Admin（管理后台）

**移动卡片双轨**——✅ 可用性从「灾难」升到「能用」。

但仍可批判：

**`CrawlerPage`**

- 移动「子任务置顶 + 折叠」后，**单页仍极长**；行内 icon 四连击 + truncate 错误——运维场景下**依然吃力**。
- 子任务 50 条硬 cap、textarea `rows={2}`——**未因 Phase 2 而变**。

**`PlansPage`**

- 月价单位仍为「分」——**运营踩坑点未做人化展示**。
- Dialog 移动单列——✅；表格桌面 `min-w-[880px]` 可接受。

**`AdminHomePage`**

- 仍只有 6 KPI、无 drill-down——与 Stats/Revenue **功能重叠感未消**。

**`SiteContentPage`**

- Phase 7 声称 `beforeunload` + 切换 confirm——✅ 若已实现则数据丢失风险下降；移动侧栏堆顶**结构性问题仍在**。

**`RevenuePage`**

- 饼图 label 改图例——✅；MRR hint 长文本溢出——**需线上再验**。

### 3.7 Editor + Agent

**移动写作**——Phase 8–12 是**本轮最大实质性胜利**：分屏选章、排序、跨卷、版本 Sheet、过程折叠，原审计最尖锐的痛点大部分消解。

仍批判：

**`EditorChatMessage` 移动折叠**

- 默认折叠依赖用户点「查看创作过程 · N 步」——**可发现性仍靠学习**；新用户第一次可能不知道 Agent 做了什么。
- 流式进行中不折叠——合理，但单条 timeline 在生成时**仍可能占满屏**。

**`StoryMobileChapterPicker`**

- 功能堆叠：选章 + 排序 + 跨卷 + 卷序——**移动顶栏 38vh 分屏**对写作区挤压大；小屏手机编辑区可能只剩半屏。

**桌面 Editor**

- 侧栏信息密度（小说树 → 会话 → 搜索 → batch → kebab → memory/settings）**依旧陡峭**——优化聚焦移动，桌面新手路径未简化。

**Loader 体系**

- `BrandLoader` / `InlineBrandLoader` / `AuthSpinner` / `NovelAiCubeLoader` / `ThinkingHandLoader`——**命名与视觉仍多套**；styled 删了，loader 方言还在。

### 3.8 UI 原语

**`button.tsx` vs `EditorButton` vs `MKT_CTA_*`**

- Editor 已迁 shadcn `Button`——✅ 工程上统一。
- 营销 CTA 仍大量原生 `Link`/`button` + Tailwind 字符串——**shadcn 采用率刻意分裂**。

**`NeumorphicSwitch`**

- Phase 2C 称 Editor Switch 已换 shadcn——需确认文件是否仍存；若仍保留组件文件，**又是潜在双轨**。

**`AppDialog` vs `dialog.tsx`**

- 未合并——Confirm 走 Host，Editor Session 可能仍走 AppDialog——**acceptable 但非「单壳」**。

---

## 四、Phase 文档声称 vs 复验偏差

| 声称 | 复验意见 |
|------|----------|
| 「frontend/src 零 runtime styled-components」 | ✅ 属实 |
| 「Modal 单壳」 | ⚠️ 主路径是 `AppModalShell`，legacy 导出 + AppDialog/Confirm 并存 |
| 「无 backlog」 | ❌ **过度声明**——CTA 形状双轨、Hero 信息密度、Crawler 运维密度、Plans 分单位、Login 找回密码产品缺口等仍在 |
| 「Dashboard / Admin 表格正常」 | ✅ 桌面正常；移动改为卡片——**正常≠优雅** |
| 「账户三入口」收敛 | ✅ Modal 已删；Nav + 侧栏头像 + Settings 页——**三入口但行为一致** |

---

## 五、各页面快速复验表

| 页面 | 优化前等级 | 优化后等级 | 一句话 |
|------|------------|------------|--------|
| `HomePage` | 差 | 中 | 移动可见性与 rhythm 改善；首屏仍满、Danmaku/Footer 拼接未改 |
| `GuidePage` | 差 | 中上 | 移动 TOC 到位；suitability 仍偏后 |
| `PricingPage` | 中 | 中上 | 高亮 scale 修复；Hero 仍无 action（靠 subpage CtaBand） |
| `AboutPage` | 中 | 中 | subpageCta 补漏斗；深色 Hero 孤立感仍在 |
| `GenericContentPage` | 中 | 中上 | i18n 补齐 |
| `LoginPage` / `RegisterPage` | 差 | 中上 | 高度/错误/网格大幅改善；Verify 仍异族 |
| `VerifyEmailPage` | 差 | 中 | 补链路与 CTA token；非 AuthShell |
| `DashboardHomePage` | 中 | 中 | 宽度/热力图修复；CTA 三重冗余 |
| `NovelsPage` | 中 | 中上 | novelId 链修复；空态 editor 仍裸链 |
| `BookstorePage` | 差 | 中上 | 错误态/intro action 修复 |
| `BillingPage` | 中 | 中 | 移动卡片有；明细隐藏逻辑需再验 |
| `SettingsPage` | 中 | 中上 | intro + 共享 sections |
| `AdminHomePage` | 差 | 差 | 仍空 |
| `UsersPage` | 差 | 中上 | debounce + 移动卡片 |
| `CrawlerPage` | 差 | 中 | 移动 reorder/折叠；密度仍高 |
| `AuditLogPage` | 差 | 中上 | 卡片 + JSON Modal |
| `PlansPage` | 差 | 中 | 移动可用；分单位仍坑 |
| `EditorPage` | 差 | 中上 | 移动路径质变；小屏编辑区偏矮 |
| 营销共享组件 | 中 | 中上 | Tailwind 化完成；CTA 形状仍 full |

等级说明：**差** = 移动或主路径明显不可用 / 严重不一致；**中** = 可用但有明显粗糙；**中上** = 主路径顺畅仍有 polish 空间；**优** = 本轮未授予任何页面。

---

## 六、结论（二次验收）

### 6.1 确实做对了什么

1. **工程统一**：styled-components 清除、`breakpoints.ts`、Tailwind 化 editor/marketing/agent，维护成本显著下降。  
2. **Admin 移动从不可用到可用**：卡片双轨 + 爬虫页移动 IA 调整，是运维向的关键修复。  
3. **Editor 移动从「不可用」到「可完成写作」**：分屏选章 + Agent 过程折叠，对齐产品核心价值。  
4. **Auth 与品牌**：高度、错误反馈、Novel AI 命名——消除了一整类「低级不一致」。

### 6.2 尚未真正闭环什么

1. **视觉方言**：营销 `rounded-full` vs 应用 `rounded-xl`——**两套 CTA 体系故意并存**，用户跨区仍会感知分裂。  
2. **Modal/Loader 命名与入口**：`AppModalShell` 为主但非唯一；loader 仍多套——**文档写「单壳/统一」略超前**。  
3. **信息架构冗余**：Dashboard Hero CTA 三重、Admin Home 空洞、Crawler 运维密度——**不是 bug，是产品/UI 懒惰**。  
4. **语义型问题**：忘记密码走客服、Plans 价格分、Novels 空态裸 `/editor`——**文案或局部修复，根因未动**。

### 6.3 终审立场

若以「能否上线、移动能否完成主流程」为标准——**优化后前端达标**。  
若以首轮审查「每个页面、每个组件都经得起挑剔审视」为标准——**仍有清晰短板，不宜宣称零 backlog**。

更准确的状态描述：

> **Phase 1–15 完成了从「缝合怪」到「有主壳的产品 UI」的跨越；下一步若再优化，应聚焦 CTA token 全站化、Admin 运维页降密、Dashboard 去冗余 CTA，而非继续删 styled-components。**

---

## 七、建议验收动作（非改代码）

线上无痕强刷后建议重点看：

1. **≤767px `/editor`**：分屏选章高度是否挤压编辑器；排序/跨卷是否可发现。  
2. **`/admin/crawler` 移动**：折叠默认态下是否找不到主编排。  
3. **`/` Hero**：首屏是否仍需要滚动才能点到主 CTA。  
4. **`/login` → 忘记密码**：用户是否接受「联系客服」而非自助找回。  
5. **深色模式 Auth 卡**：`bg-surface/95` 是否与背景协调（源码已改，需肉眼确认）。

---

## 附录：本次复验抽查文件

```
frontend/src/lib/breakpoints.ts
frontend/src/lib/marketingCta.ts
frontend/src/lib/appButtonTokens.ts
frontend/src/components/ui/AppModalShell.tsx
frontend/src/components/auth/AuthShell.tsx
frontend/src/components/auth/AuthField.tsx
frontend/src/pages/RegisterPage.tsx
frontend/src/pages/VerifyEmailPage.tsx
frontend/src/pages/GuidePage.tsx
frontend/src/components/marketing/MarketingPageLayout.tsx
frontend/src/components/layout/AppShellMain.tsx
frontend/src/components/admin/UserTable.tsx
frontend/src/layouts/AdminLayout.tsx
frontend/src/components/editor/EditorStoryPanel.tsx
frontend/src/components/editor/EditorChatMessage.tsx
frontend/src/pages/dashboard/BookstorePage.tsx
frontend/src/pages/dashboard/DashboardHomePage.tsx
```
