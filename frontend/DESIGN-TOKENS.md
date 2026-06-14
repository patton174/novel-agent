# 前端设计 Token 速查

> 新人改 UI 时优先查本页，避免 pill / modal / loader 混用。

## CTA 与按钮

| 场景 | 引用 | 圆角 |
|------|------|------|
| 营销主/次 CTA | `frontend/src/lib/marketingCta.ts` → `MKT_CTA_*` | `rounded-xl` |
| 应用内按钮 | `frontend/src/lib/appButtonTokens.ts` → `APP_BTN*` | `rounded-xl` |
| 认证页全宽提交 | `AuthSubmitButton` / `MKT_CTA_AUTH` | `rounded-xl` |

**规则**：可点击主操作一律 `rounded-xl`；`rounded-full` 仅用于头像、进度点、开关等非按钮装饰。

## 标签 / Chip

| 场景 | 圆角 |
|------|------|
| Eyebrow、统计 badge、genre 标签 | `rounded-lg` 或 `rounded-xl` |
| 弹幕轨道装饰 | 可保留 pill（非 CTA） |

Admin 快捷链、Guide 移动 TOC 等与 Dashboard 按钮对齐时用 `rounded-xl`。

## Modal

| 场景 | 组件 |
|------|------|
| Editor / Dashboard 通用 | `AppModalShell` |
| 尺寸 class | `appModalClasses.ts` → `APP_MODAL_*` |

新增 Admin 弹窗优先 `AppModalShell`，避免裸 `DialogContent` 复制间距。

## Loading

| 场景 | 组件 |
|------|------|
| 路由 / 全屏 | `BrandLoader`（内部 `AppSpinner variant="brand"`） |
| 按钮 / 行内 | `AppSpinner` |

勿新增第三套 spinner 组件。

## 断点

- 应用移动：`APP_MOBILE_MAX_PX` / `useAppMobile()`（`lib/breakpoints.ts`）
- 营销页可与 Tailwind `md:` 并用，Editor/Dashboard 以 `767px` 为准

## 响应式书写规范

- 优先使用单方向 `md:`（min-width）从移动到桌面的渐进增强。
- `max-md:` 仅允许用于必须覆盖桌面默认布局的少量场景（如遗留弹窗定位覆盖）。
- 禁止引入第三断点（如 `900px`）；统一使用 `767/768` 这一组全站断点。
- JS 端响应式判断只使用 `useAppMobile()` 或 `matchesAppMobile()`，禁止组件内直接写 `window.matchMedia(...)`。

## 编辑器路由

- 新建作品：`/editor?action=create` → `EDITOR_CREATE_HREF`（`lib/editorRoutes.ts`）
- 继续写作：`/editor?novelId=<id>` → `editorNovelHref(id)`

## 参考

- 待办清单：`docs/frontend-ui/README.md`（索引）· `docs/frontend-ui-optimization-backlog.md`
- Phase 执行记录：`docs/plans/2026-06-12-frontend-phase2.md`
