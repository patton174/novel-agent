# Novel Agent 前端 UI 第四轮验收审查报告

> **审查日期**：2026-06-12（Phase 17–20 后）  
> **对照**：[`frontend-ui-optimization-backlog.md`](frontend-ui-optimization-backlog.md)（backlog 项已基本 `[x]`）  
> **审查立场**：验证 Phase 17–20 落地真实性，找出**仍残留**的问题与**新发现**的技术债  
> **审查依据**：当前 `frontend/src` 源码

---

## 一、终审结论

| 维度 | 第三轮 | 第四轮 |
|------|--------|--------|
| Backlog P1/P2 完成度 | 大量未完成 | **≈100% 代码项已落地** |
| 产品 UI 验收 | 通过 v1 | **通过 v2（可对外宣称 UI 抛光完成）** |
| 工程洁净度 | 中上 | 中 | **高** |
| 吹毛求疵级审查 | 仍有明显短板 | **仅剩 polish / 清理 / E2E** |

**一句话**：Phase 17–20 确实把 backlog 里列出的体验问题逐项关掉了；当前前端从「能用的产品 UI」进入「**可维护的设计 token + 统一壳层**」阶段。第四轮不再建议大规模改版，后续工作应以**删除死代码、统一 import、可选 E2E** 为主。

---

## 二、Phase 17–20 源码验证（抽样）

| Backlog 项 | 验证 | 关键证据 |
|------------|------|----------|
| 1.1 VerifyEmail → AuthShell | ✅ | `VerifyEmailPage.tsx` 使用 `AuthShell` + `AppSpinner` |
| 1.2 Captcha safe-area | ✅ | `pb-[max(1rem,env(safe-area-inset-bottom))]`；错误区 `errorMessage` 多行非 truncate |
| 2.1 Novels 新建统一 | ✅ | `EDITOR_CREATE_HREF`、`editorNovelHref` in `editorRoutes.ts` |
| 2.2 Dashboard 顶栏 CTA | ✅ | `hideEditorCta = pathname.startsWith('/dashboard')` |
| 2.3 Dashboard Hero 降噪 | ✅ | 无 blur 圆；`bg-surface` + `rounded-xl` badge |
| 3.1 分屏 32vh + 全屏编辑 | ✅ | `max-h-[min(28dvh,36svh)]` + `pickerCollapsed` |
| 3.2 流式过程折叠 | ✅ | `canCollapseProcess` 含 `streamActive`；默认 `processExpanded=false` |
| 4.1 Footer `-mt-16` | ✅ | `HomeFooterSection` 无负 margin |
| 4.2 桌面 Hero 78vh | ✅ | `md:min-h-[78vh]` |
| 4.3 Feasibility 克制 | ✅ | 统一 `bg-surface` 卡，无三色 ring |
| 4.4 DESIGN-TOKENS + AdminQuickLinks xl | ✅ | `frontend/DESIGN-TOKENS.md`；`AdminQuickLinks` `rounded-xl` |
| 5.1 Crawler 降密 + 分页 | ✅ | `CrawlJobRow` KebabMenu；`JOBS_PAGE_SIZE=20` |
| 5.2 SiteContent 移动 Select | ✅ | `lg:hidden` + `AdminNativeSelect` |
| 5.3 Admin Modal → AppModalShell | ✅ | UserEdit/Catalog/Crawl/Audit/Plans 均已迁移 |
| 6.1 Billing 空明细可见 | ✅ | 移动卡片 + 桌面表头空态文案 |
| 7.1 AppSpinner | ✅ | `AuthSpinner` re-export；Verify 用 `AppSpinner` |
| 7.2 deprecated 清理 | ⚠️ 部分 | `AppPageStack` 已仅 `compact`；`AuthResultCard` 仍存 |
| 8.1 Editor 侧栏 onboarding | ✅ | 「快速开始」+ `KebabMenu` 收设置 |
| Hero eyebrow xl | ✅ | `HomeHeroSection` eyebrow 已 `rounded-xl`（Feasibility eyebrow 仍为 full pill） |

---

## 三、页面等级（第四轮）

| 页面 | 三轮 | 四轮 | 说明 |
|------|------|------|------|
| `/verify-email` | 中 | **优** | 已 AuthShell |
| `/login` `/forgot-password` `/reset-password` `/register` | 优 | **优** | Auth 族完整 |
| `/dashboard` 及子路由 | 中上 | **优** | Hero 降噪、顶栏去重、editorRoutes |
| `/editor` 移动 | 优 | **优** | 分屏+全屏+流式折叠 |
| `/editor` 桌面 | 中 | 中 | 侧栏有 onboarding，密度仍高（可接受） |
| `/` 营销首页 | 中上 | **优** | 移动降密、Footer 衔接、Feasibility 移动卡 |
| `/guide` | 优 | **优** | suitability 顺序；TOC chip 仍 full（见 §4） |
| `/admin/crawler` | 中 | **中上** | 分页+Kebab；页仍长 |
| `/admin/*` 其余 | 中上 | **优** | Modal 统一、SiteContent 移动 OK |
| 全站 | — | **优（主路径）** | 无 P0 级 UI 阻塞 |

---

## 四、仍存在的问题（第四轮 — 建议 Phase 21+）

> **2026-06-12 更新**：Phase 21 已全部落地，本节保留为历史记录。

### P3 — 死代码与 deprecated（~~建议清理~~ ✅ Phase 21 已关闭）

| # | 问题 | 状态 |
|---|------|------|
| 4.1 | `AuthResultCard` 零引用 | ✅ 已删除 |
| 4.2 | `NovelAiCubeLoader` / `ThinkingHandLoader` + CSS | ✅ 已删除 |
| 4.3 | `AuthSpinner` deprecated 别名 | ✅ 全站 `AppSpinner` |
| 4.4 | `editorTheme.ts`、`surfaces.tsx` | ✅ 已删除 |
| 4.5 | `useEditorMobile` deprecated | ✅ 改 `useAppMobile` |

### P3 — 与 DESIGN-TOKENS 微偏（~~可选~~ ✅ Phase 21 已对齐）

| # | 问题 | 状态 |
|---|------|------|
| 4.6 | Guide TOC / STEP badge | ✅ `rounded-xl` |
| 4.7 | Feasibility eyebrow | ✅ `rounded-xl` |
| 4.8 | Login/Register 营销 pill | ✅ `rounded-xl` |

### P2 — 体验边缘（非阻塞）

| # | 问题 | 说明 |
|---|------|------|
| 4.9 | **UserEditDialog 嵌套 Sheet** | 主壳 `AppModalShell` + 用量明细 `Sheet` — 可用，但 Modal 内 Modal 层级深 |
| 4.10 | **Crawler 页移动仍偏长** | 已有折叠+分页；主编排+日志+子任务同页，运维向可接受 |
| 4.11 | **Captcha 滑轨 hint 仍 truncate** | 「向右拖动滑块」为固定短文案 truncate 无妨；与 error 区已分离 |
| 4.12 | **桌面 Editor 侧栏学习曲线** | onboarding 提示已有；深度 IA 简化属产品迭代非 bug |

### 不在代码范围

| # | 项 |
|---|-----|
| 4.13 | 邮件进垃圾箱 / 忘记密码送达率（运维） |
| 4.14 | 全站 E2E（backlog 已标可选） |
| 4.15 | 全站 redesign |

---

## 五、相对首轮审计的演进

```
首轮（缝合怪）→ Phase 1–16（Tailwind 化 + 移动可用）
→ 三轮（v1 通过，CTA/Auth/Crawler 等待办）
→ Phase 17–20（backlog 清零）
→ 四轮（v2 通过，仅剩 dead code + 微偏 pill）
→ Phase 21（工程收敛 + pill 对齐 + vitest smoke）
```

**首轮「灾难级」项**：Admin 表格移动、Editor 移动路径、品牌分裂、Auth 高度 — **均已关闭**。  
**首轮「中等级」项**：Footer 拼接、Verify 异族、Dashboard CTA 冗余 — **均已关闭**。  
**Phase 21 后**：dead code / deprecated 别名 / 圆角微偏 — **均已关闭**。

---

## 六、验收判定

### 6.1 建议判定：**通过 UI 验收 v2**

- Backlog [`frontend-ui-optimization-backlog.md`](frontend-ui-optimization-backlog.md) 所列 P1/P2 **均已 `[x]`**，源码抽查一致。  
- 主路径（营销 → 注册/登录 → Dashboard → Editor → Admin）**视觉与交互同一设计语言**。  
- `frontend/DESIGN-TOKENS.md` 可作为新人入口。

### 6.2 Phase 21 — ✅ 已完成

1. ✅ 删除 `AuthResultCard`、`NovelAiCubeLoader`、`ThinkingHandLoader` + CSS  
2. ✅ `AuthSpinner` → `AppSpinner` 全站替换  
3. ✅ Guide / Feasibility / Login-Register pill → `rounded-xl`  
4. ✅ `useEditorMobile` → `useAppMobile`；删 `editorTheme.ts`、`surfaces.tsx`  
5. ✅ vitest smoke：`frontend/src/lib/uiSmoke.test.ts`  
6. 文档索引：[`docs/frontend-ui/README.md`](frontend-ui/README.md)

**不建议**再开大规模 UI 改版。

---

## 七、线上回归清单（第四轮）

1. https://www.novel-agent.cn 无痕强刷  
2. **Auth 全链**：login → register → captcha → **verify-email（AuthShell）** → forgot → reset  
3. **Dashboard**：任意 `/dashboard/*` 顶栏无重复编辑器按钮；Novels「新建」→ `?action=create`  
4. **Editor 移动**：分屏 →「全屏」收起 → Agent 流式默认折叠 → 展开过程  
5. **Admin 移动**：crawler 分页、plans `¥/月`、site-content 下拉选页  
6. **营销移动 `/`**：首屏无 demo，双 CTA 可见  
7. **深色模式**：Auth / Dashboard / Editor 抽样  

---

## 八、文档索引

| 文档 | 状态 |
|------|------|
| [`frontend-ui-audit.md`](frontend-ui-audit.md) | 历史 + Phase 1–16 |
| [`frontend-ui-audit-round3-2026-06-12.md`](frontend-ui-audit-round3-2026-06-12.md) | 三轮 v1 |
| **本文** | 四轮 v2 |
| [`frontend-ui-optimization-backlog.md`](frontend-ui-optimization-backlog.md) | 已完成（含 Phase 21） |
| [`frontend-ui/README.md`](frontend-ui/README.md) | **文档索引** |
| [`frontend/DESIGN-TOKENS.md`](../frontend/DESIGN-TOKENS.md) | 现行规范 |

---

## 附录：Phase 21 — 清理包 ✅

- [x] 删除 AuthResultCard（零引用）
- [x] 删除 NovelAiCubeLoader / ThinkingHandLoader + 对应 CSS
- [x] AuthSpinner → AppSpinner 全站替换
- [x] Guide 移动 TOC / STEP badge → rounded-xl
- [x] Feasibility / Login / Register pill → rounded-xl
- [x] useEditorMobile → useAppMobile；删 editorTheme.ts、surfaces.tsx
- [x] vitest smoke（`uiSmoke.test.ts`）
