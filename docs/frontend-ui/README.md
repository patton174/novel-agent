# 前端 UI 文档索引

> Novel Agent 前端 UI 审查、验收与抛光工作的**唯一入口**。新人改 UI 前先读 [`frontend/DESIGN-TOKENS.md`](../../frontend/DESIGN-TOKENS.md)。

## 当前状态（2026-06-12）

| 阶段 | 结论 |
|------|------|
| Phase 1–16 | 原始批判项闭环 |
| Phase 17–20 | Backlog P1/P2 体验项落地 |
| **Phase 21** | 死代码清理、import 收敛、圆角对齐、vitest smoke |
| **UI 验收** | **v2 通过**（主路径无 P0 阻塞） |

## 文档地图

| 文档 | 用途 |
|------|------|
| [`frontend-ui-audit.md`](../frontend-ui-audit.md) | 首轮批判清单 + Phase 1–16 摘要 |
| [`frontend-ui-audit-revalidation-2026-06-12.md`](../frontend-ui-audit-revalidation-2026-06-12.md) | 二次验收（Phase 1–15 后） |
| [`frontend-ui-audit-round3-2026-06-12.md`](../frontend-ui-audit-round3-2026-06-12.md) | 三轮验收（Phase 16，v1 通过） |
| [`frontend-ui-audit-round4-2026-06-12.md`](../frontend-ui-audit-round4-2026-06-12.md) | 四轮验收（Phase 17–20，v2 通过） |
| [`frontend-ui-optimization-backlog.md`](../frontend-ui-optimization-backlog.md) | 可交接待办；**Phase 21 已全部 `[x]`** |
| [`frontend-ui-critique-2026-06-14.md`](../frontend-ui-critique-2026-06-14.md) | **新轮批判**：桌面/移动未分离、移动卡顿、臃肿、文案重复（C-1…C-13） |
| [`frontend-ui-mobile-desktop-optimization-2026-06-14.md`](../frontend-ui-mobile-desktop-optimization-2026-06-14.md) | **新轮优化方案**：性能止血 + 分离规范 + 文案单源 + 瘦身（P0…P3） |
| [`frontend-ui-design-system-audit-2026-06-14.md`](../frontend-ui-design-system-audit-2026-06-14.md) | **设计系统批判 + 统一规范**：主题/token/排版/按钮/IA/动画/i18n（含实现批次 D1…D5） |
| [`plans/2026-06-12-frontend-phase2.md`](../plans/2026-06-12-frontend-phase2.md) | Phase 1–21 执行记录 |
| [`frontend/DESIGN-TOKENS.md`](../../frontend/DESIGN-TOKENS.md) | CTA / Modal / Loader / 断点 / 路由规范 |

## Phase 21 变更摘要

- 删除零引用：`AuthResultCard`、`NovelAiCubeLoader`、`ThinkingHandLoader` 及对应 CSS
- `AuthSpinner` → 全站 `AppSpinner`；删除 deprecated re-export
- `useEditorMobile` → `useAppMobile`；删除 deprecated 别名
- Guide TOC / STEP badge、Feasibility eyebrow、Login/Register 营销 pill → `rounded-xl`
- `DropdownSelect` 改从 `@/styles/theme` 导入；删除 `editorTheme.ts`、`surfaces.tsx`
- 新增 `frontend/src/lib/uiSmoke.test.ts`（路由 / 断点 / CTA 几何）

## 线上回归清单

合并 UI 改动后建议按 [`frontend-ui-optimization-backlog.md` §线上回归](../frontend-ui-optimization-backlog.md) 逐项手测：

1. https://www.novel-agent.cn 无痕强刷
2. Auth：login → register → captcha → verify-email；forgot → reset
3. Dashboard 各子页顶栏 CTA 不重复
4. Editor 移动：分屏选章、折叠 Agent 过程
5. Admin 移动：crawler 子任务、users 卡片
6. 深色模式：Auth、Dashboard、Editor

## 不在范围

- 全站 redesign / 换配色
- 编辑器桌面三栏产品级改版
- Playwright E2E（可单独立项；当前以 vitest smoke 覆盖 token 约定）
