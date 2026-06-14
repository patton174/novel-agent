# Novel Agent 前端 UI 第三轮验收审查报告

> **审查日期**：2026-06-12（Phase 16 后）  
> **对照文档**：[`frontend-ui-audit.md`](frontend-ui-audit.md) · [`frontend-ui-audit-revalidation-2026-06-12.md`](frontend-ui-audit-revalidation-2026-06-12.md) · [`plans/2026-06-12-frontend-phase2.md`](plans/2026-06-12-frontend-phase2.md) Phase 16  
> **审查立场**：在二次验收基础上，验证 Phase 16 是否关闭剩余可代码化项，并给出**是否通过产品级 UI 验收**的终审意见  
> **审查依据**：当前 `frontend/src` 源码（未含线上真机走查）

---

## 一、终审结论

| 维度 | 第二轮（Phase 15 后） | 第三轮（Phase 16 后） |
|------|----------------------|----------------------|
| 工程统一 | 优 | **优**（legacy Modal 删除、CTA token 全站 `rounded-xl`） |
| 移动主路径 | 中上 | **优**（Hero 降密、Feasibility 卡片对比、Editor 32vh） |
| 视觉方言 | 中（pill vs xl 双轨） | **中上**（主 CTA 已统一；装饰 pill / 导航 chip 仍用 `rounded-full`，可接受） |
| 产品语义 | 中（忘记密码走客服） | **中上**（`/forgot-password` + `/reset-password` 完整 AuthShell 流） |
| Admin 运维 | 中 | **中**（Plans 人化价格、Admin 快捷入口；Crawler 密度仍高） |
| **综合验收** | **有条件通过** | **通过**（以「上线 + 移动可完成主流程 + 设计 token 基本统一」为标准） |

**一句话**：Phase 16 把二次验收里「能写进代码的」几乎都写了；剩余问题多为**信息密度、装饰性 pill、个别裸链 `/editor`**，不再阻塞产品验收。若仍以「每个组件都经得起挑剔」为标准，Crawler 移动页与 VerifyEmail 异族壳层仍是主要扣分项。

---

## 二、Phase 16 逐项验证

| Phase 16 项 | 状态 | 证据 |
|-------------|------|------|
| CTA token 统一 `rounded-xl` | ✅ | `lib/marketingCta.ts` 文件头声明与 `appButtonTokens` 对齐；Feasibility/Danmaku/Footer/Auth 均走 token |
| 删除 `EditorModalShell.legacy` | ✅ | `EditorModalShell.tsx` 仅 re-export `AppModalShell` |
| Hero 移动降密 | ✅ | trust pills / demo / scroll hint 均为 `hidden … sm:flex` 或 `sm:block` |
| Guide 移动 IA | ✅ | 独立 `lg:hidden` suitability 块在步骤 `ol` 之前 |
| Dashboard Hero 去三重 CTA | ✅ | `DashboardQuickActions` 在 `/dashboard` 隐藏编辑器按钮；Hero 带 `novelId` 上下文 +「管理作品」 |
| Editor 分屏 32vh | ✅ | `StoryMobileChapterPicker` `max-h-[32vh]` |
| 过程折叠高对比 + chevron | ✅ | `MOBILE_PROCESS_TOGGLE` + `ChevronDown` rotate |
| Plans 月价人化 | ✅ | `formatPlanPrice` → `¥N/月`；表头「月价（元）」 |
| Register 关闭态 legal/footer | ✅ | `AuthShell` 始终传入 `legal` / `footer`（关闭时 footer 文案切换） |
| Crawler textarea 加高 | ✅ | `rows={5}` |
| 忘记密码自助流程 | ✅ **超出 Phase 16 勾选** | 新增 `ForgotPasswordPage` / `ResetPasswordPage` + 路由；Login 链 `/forgot-password` |
| Feasibility 移动卡片对比 | ✅ **二次验收未要求、本轮新增** | `md:hidden` 卡片网格替代表格横滑 |
| AdminHome 快捷入口 | ✅ **二次验收未要求、本轮新增** | `AdminQuickLinks` 卡片 |
| Settings 订阅摘要去重 | ✅ | `AccountSettingsSections` 仅链 `/dashboard/billing`，无 token 双显 |

---

## 三、相对二次验收：已关闭的批判点

以下在 [`frontend-ui-audit-revalidation-2026-06-12.md`](frontend-ui-audit-revalidation-2026-06-12.md) §3 中提出，**本轮确认已解决**：

1. **营销 vs 应用 CTA 形状双轨** → `marketingCta.ts` 全面 `rounded-xl`，与 `APP_BTN` 几何一致。  
2. **Modal legacy 名不副实** → legacy 文件已删，壳层收敛为 `AppModalShell` + shadcn `Dialog`/`Sheet` + `ConfirmDialogHost`。  
3. **Hero 移动信息过载** → 小屏仅保留 eyebrow + 标题 + 副文 + 双 CTA。  
4. **Feasibility 520px 横滑** → 移动改为逐行卡片对比，桌面保留表格。  
5. **Guide suitability 顺序** → 移动块置于步骤前。  
6. **Dashboard 三重「进入编辑器」** → 概览页 Header 隐藏重复 CTA，Hero 上下文化链接。  
7. **Danmaku 发送钮形状** → `MKT_CTA_PRIMARY_INLINE`（`rounded-xl`）。  
8. **忘记密码语义缺口** → 完整邮箱重置流 + AuthShell。  
9. **Plans 运营「分」踩坑** → `formatPlanPrice` 展示元/月。  
10. **Register 关闭态像半成品** → legal/footer 常驻。  
11. **AdminHome 空洞** → 快捷入口 + 6 KPI 双 API 加载。

---

## 四、仍值得批判的问题（第三轮）

### 4.1 全局

**Modal 仍非物理单文件**  
`AppModalShell` 已是 Editor/Dashboard 主壳，但 Admin 页（`UserEditDialog`、`CatalogReaderModal`、`CrawlJobDetailModal` 等）仍直接 compose shadcn `DialogContent` + `appModalClasses`——**架构统一、实现分散**，可维护但谈不上「一个组件统治一切」。

**Loader 多方言**  
`AuthSpinner`、`InlineBrandLoader`、`BrandLoader`、`NovelAiCubeLoader`、`ThinkingHandLoader` 并存——styled 清掉了，**加载动画品牌仍未收敛为 1–2 个**。

**装饰性 `rounded-full` 仍在**  
Eyebrow pill、Guide 移动 TOC chip、Auth 营销侧栏 tag、`AdminQuickLinks`——**不是 CTA 回归 pill**，但全站圆角语义仍是「xl = 可点、full = 标签/芯片」，新同学易误用。

### 4.2 营销

**`HomeFooterSection` `-mt-16`**  
首页 full footer 仍侵入 Danmaku 深色区——**视觉拼接策略未改**；子页已有 `MarketingSubpageCtaBand`，首页末尾色带仍密。

**Hero 桌面**  
`md:min-h-[92vh]` + demo + scroll hint——**桌面首屏仍偏长**；移动已降密，桌面漏斗未同样收紧。

**Persona 卡三色 hover ring**  
Feasibility 三卡 accent 仍花哨——**landing 审美，非产品克制**。

### 4.3 认证

**`VerifyEmailPage` 仍非 AuthShell**  
有 Wordmark + `AuthResultCard` + token 按钮——**比二轮好，但与 Login/Register/Forgot 仍异族**；邮件深链用户感知「换页了」。

**`SliderCaptchaModal`**  
safe-area、长错误 truncate——**三轮未看到改动**，注册流程移动底部仍可能遮挡。

**Forgot/Reset 流**  
UI 完整；**后端/API 行为未在本审查验证**（仅确认前端壳层与字段校验齐全）。

### 4.4 Dashboard

**`NovelsPage` 裸链 `/editor`**  
「新建小说」「创建第一部作品」仍链 `/editor` 无 `novelId`——**若编辑器内建「创建小说」则合理**，但与卡片「继续写作」带参行为**仍不对称**；二轮提过，三轮未改。

**`DashboardHomePage` Hero**  
渐变 + blur 装饰 + badge——**创作台内仍带营销味**，与 Admin 冷静表格风反差存在（产品选择，非 bug）。

**Header QuickActions 非概览页**  
其他 dashboard 子路由仍显示「进入编辑器」裸链——**仅概览页做了去重**，子页仍可能重复。

### 4.5 Admin

**`CrawlerPage`**  
textarea 加至 5 行、移动折叠/置顶——**页仍极长、行内四 icon 仍密**；运维向页面**可用但不优雅**。

**`AdminQuickLinks`**  
`rounded-full` chip 链——与全站 CTA `rounded-xl` **芯片风格不统一**（次要）。

**`SiteContentPage` 移动**  
侧栏堆顶——**结构性限制**，Phase 7 beforeunload 有，布局未 revolution。

### 4.6 Editor + Agent

**分屏 32vh**  
比 38vh 多给编辑区——✅；**小屏（如 iPhone SE）编辑区仍可能 ≤50% 视高**，长章写作偏挤。

**Agent 过程折叠**  
chevron + 高对比条——✅；**流式生成中不折叠**，长 run 仍可能占满屏（符合预期，但需用户预期管理）。

**桌面 Editor 侧栏**  
信息密度高、学习曲线陡——**三轮未动**，非回归。

---

## 五、页面等级（第三轮）

| 页面 | 二轮 | 三轮 | 变化要点 |
|------|------|------|----------|
| `HomePage` | 中 | **中上** | 移动 Hero 降密；Feasibility 移动卡片 |
| `GuidePage` | 中上 | **优** | suitability 顺序 + CTA token |
| `PricingPage` | 中上 | **中上** | 无大改 |
| `LoginPage` | 中上 | **优** | 忘记密码真实流程 |
| `ForgotPasswordPage` / `ResetPasswordPage` | — | **优** | 新增，AuthShell 一致 |
| `RegisterPage` | 中上 | **优** | 关闭态 footer/legal |
| `VerifyEmailPage` | 中 | 中 | 仍异族壳 |
| `DashboardHomePage` | 中 | **中上** | CTA 去重 + novelId |
| `NovelsPage` | 中上 | 中上 | 裸 `/editor` 仍在 |
| `BookstorePage` | 中上 | 中上 | 稳定 |
| `SettingsPage` | 中上 | **优** | 账单去重 |
| `BillingPage` | 中 | 中 | 稳定 |
| `AdminHomePage` | 差 | **中上** | AdminQuickLinks |
| `UsersPage` / `AuditLogPage` | 中上 | 中上 | 稳定 |
| `PlansPage` | 中 | **中上** | 价格人化 |
| `CrawlerPage` | 中 | 中 | textarea 略好，仍密 |
| `EditorPage` 移动 | 中上 | **优** | 32vh + 折叠增强 |
| `EditorPage` 桌面 | 中 | 中 | 稳定 |

**本轮首次给出「优」的页面**：Guide、Login、Forgot/Reset、Settings、Editor 移动——**主路径与 Auth 族完整度达标**。

---

## 六、路由与组件覆盖清单

### 6.1 路由（27 条有效页面）

| 路由 | 页面 | 三轮结论 |
|------|------|----------|
| `/` | HomePage | 中上 |
| `/guide` | GuidePage | 优 |
| `/pricing` | PricingPage | 中上 |
| `/about` | AboutPage | 中上 |
| `/privacy` `/terms` `/contact` | GenericContentPage | 中上 |
| `/login` | LoginPage | 优 |
| `/register` | RegisterPage | 优 |
| `/forgot-password` | ForgotPasswordPage | 优 |
| `/reset-password` | ResetPasswordPage | 优 |
| `/verify-email` | VerifyEmailPage | 中 |
| `/editor/*` | EditorPage | 移动优 / 桌面中 |
| `/dashboard` | DashboardHomePage | 中上 |
| `/dashboard/novels` | NovelsPage | 中上 |
| `/dashboard/bookstore` | BookstorePage | 中上 |
| `/dashboard/billing` | BillingPage | 中 |
| `/dashboard/settings` | SettingsPage | 优 |
| `/admin` | AdminHomePage | 中上 |
| `/admin/users` | UsersPage | 中上 |
| `/admin/stats` | StatsPage | 中 |
| `/admin/crawler` | CrawlerPage | 中 |
| `/admin/catalog` | CatalogPage | 中上 |
| `/admin/plans` | PlansPage | 中上 |
| `/admin/revenue` | RevenuePage | 中 |
| `/admin/site-content` | SiteContentPage | 中 |
| `/admin/audit-log` | AuditLogPage | 中上 |
| `/admin/system-settings` | SystemSettingsPage | 中上 |

### 6.2 关键共享组件（三轮 spot-check）

| 组件 | 状态 |
|------|------|
| `marketingCta.ts` / `appButtonTokens.ts` | ✅ 几何统一 |
| `AppModalShell` | ✅ 主壳；Admin 部分仍直用 Dialog |
| `AppShellMain` / `AppPageStack` | ✅ 6xl + compact 3xl |
| `AuthShell` / `AuthField` / `AuthSubmitButton` | ✅ |
| `UserTable` 移动卡片 | ✅ |
| `StoryMobileChapterPicker` | ✅ 32vh |
| `EditorChatMessage` 移动折叠 | ✅ chevron |
| `ActivityHeatmap` | ✅ 无套娃 |
| `AccountSettingsSections` | ✅ 三入口一致 |
| `ConfirmDialogHost` | ✅ 全局确认 |
| `ThemeProvider`（styled） | ✅ 已从 `App.tsx` 移除 |

---

## 七、验收判定

### 7.1 建议判定：**通过 UI 验收（v1）**

依据：

- 首轮审计 **P0/P1 级工程与移动灾难项**均已关闭或降至可接受。  
- Phase 16 关闭二次验收 **§3 可代码化项**（含忘记密码、CTA、Hero、Guide、Dashboard、Editor、Plans）。  
- 新增页面与路由（Forgot/Reset）与 Auth 族一致，无新增分裂。

### 7.2 不建议宣称

- 「零 backlog / 全组件完美」——Crawler 密度、VerifyEmail 壳层、Loader 多方言、Footer 拼接仍在。  
- 「Modal 单壳」——应为 **「AppModalShell 为主 + Confirm + Admin 直写 Dialog」**。

### 7.3 线上验收清单（第三轮）

1. **≤640px `/`**：首屏是否仅标题 + 双 CTA（无 demo）。  
2. **`/forgot-password` → 邮件 → `/reset-password`**：AuthShell 一致性与错误态。  
3. **`/dashboard`**：Header 无「进入编辑器」；Hero「继续写作」是否带最近 novelId。  
4. **`/editor` 移动**：分屏 ≤32vh；历史消息「查看创作过程」chevron。  
5. **`/admin/plans`**：价格是否显示 `¥x/月` 而非裸分。  
6. **`/admin`**：快捷入口是否可见。  
7. **深色模式 Auth**：`bg-surface/95` 卡片对比度。

---

## 八、三轮演进摘要

```
首轮审计     → 缝合怪、移动灾难、Auth 分裂、品牌混乱
Phase 1–15   → Tailwind 化、Admin 卡片、Editor 移动重构、AppShell 6xl
二轮验收     → 有条件通过；CTA 双轨、Hero 满、忘记密码等残留
Phase 16     → CTA xl 统一、Hero 降密、Forgot/Reset、Dashboard 去重、32vh…
三轮验收     → 通过（v1）；剩余为 polish / 运维密度 / 异族 VerifyEmail
```

---

## 附录：本轮抽查路径

```
frontend/src/App.tsx
frontend/src/lib/marketingCta.ts
frontend/src/lib/appButtonTokens.ts
frontend/src/components/editor/EditorModalShell.tsx
frontend/src/components/marketing/sections/HomeHeroSection.tsx
frontend/src/components/marketing/sections/HomeFeasibilitySection.tsx
frontend/src/components/marketing/sections/HomeDanmakuSection.tsx
frontend/src/pages/GuidePage.tsx
frontend/src/pages/LoginPage.tsx
frontend/src/pages/ForgotPasswordPage.tsx
frontend/src/pages/ResetPasswordPage.tsx
frontend/src/pages/dashboard/DashboardHomePage.tsx
frontend/src/components/dashboard/DashboardQuickActions.tsx
frontend/src/components/editor/StoryMobileChapterPicker.tsx
frontend/src/components/editor/EditorChatMessage.tsx
frontend/src/pages/admin/AdminHomePage.tsx
frontend/src/pages/admin/PlansPage.tsx
frontend/src/api/billingAdminApi.ts  # formatPlanPrice
```
