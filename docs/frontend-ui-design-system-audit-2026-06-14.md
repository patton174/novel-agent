# Novel Agent 前端设计系统批判与统一规范

> **日期**：2026-06-14
> **范围**：在 [`frontend-ui-critique-2026-06-14.md`](frontend-ui-critique-2026-06-14.md)（文案/性能/分离）之外，针对**视觉设计系统**的深度审查——组件归属/IA、按钮与页面协调、国际化、亮暗主题、整体连贯性（断层）、动画一致性、排版合理性。
> **依据**：三份只读审计的源码取证（动画一致性、设计系统、国际化）。
> **核心论断**：当前前端是"**多套并行规范拼接而成**"的产物——双 CSS 入口、三套色板、两套字号体系、按钮裸写与组件混用、暗色变体大面积失效。这正是用户感知到"断层"的根因。本文先给批判与证据，再给**统一规范（single source of truth）**，作为后续实现的唯一依据。

---

## 一、总体结论

| 维度 | 评级 | 关键问题 |
|------|------|----------|
| 亮暗主题 | **差** | 无主题切换器；`dark:` 变体几乎是死代码（无 `.dark` 挂载）；`.dark` 下品牌 indigo 变灰 |
| 设计 token 单源 | **差** | 双 CSS 入口（`globals.css` / `site-globals.css`）+ `theme.ts` + `cursorLandingClasses.ts` 三套色板、两套圆角刻度 |
| 排版体系 | **中下** | 字体定义冲突（Geist vs 宋体/PingFang）；50+ 文件散落 `text-[Npx]` 魔法数字 |
| 间距/布局 | **中** | 容器宽度 7xl/6xl/5xl/4xl 混用，Nav 与正文不对齐；section `py` 节奏忽大忽小 |
| 按钮协调 | **中下** | `<Button>`(36 文件) 与裸 `<button>`(48 文件) 混用；Editor 自成 `rounded-[10px]` 体系；三档按钮高度 |
| 组件 IA | **中** | 品牌组件放 marketing 层被全站依赖；`ui/card.tsx` 零引用；Modal/Spinner/Button 多套并行 |
| 动画一致性 | **中** | 桌面 Hero demo 因 `autoPlay=false`+IO 卡静止（已修）；移动 scroll/GSAP 未与性能策略对齐 |
| 国际化 | **中下** | i18n 仅覆盖营销页 + 少量 Auth；约 62% TSX 硬编码中文；`states.*` 等新 key 未接线 |

---

## 二、亮暗主题（最严重）

### 2.1 现状

- **无主题切换器**：全站无 `ThemeProvider` / `useTheme` / `setTheme` / `localStorage` 主题持久化；`index.html` 无主题 class。
- **`dark:` 变体是死代码**：`globals.css:7` 定义 `@custom-variant dark (&:is(.dark *))`，必须祖先有 `.dark` 才生效，但**没有任何地方挂载 `.dark`**，也无 `prefers-color-scheme` 兜底。各页写的 `dark:bg-sky-950/40`（如 `LoginPage.tsx:106`）**永不触发**。
- **暗色不是统一主题，而是局部嵌入的深色块**：营销弹幕 `HomeDanmakuSection.tsx:38` `bg-[#070a14]`、Footer `bg-slate-900`、认证左栏 `.mkt-auth-panel` 深 indigo、Admin 终端 `CrawlLogTerminal.tsx:106` `#0d1117`——各写各的 hex，互不统一。
- **致命断层**：`globals.css:111` 下 `.dark --primary: oklch(0.922 0 0)`（近白灰），一旦启用暗色，**品牌 indigo 完全丢失**，与营销页 `#4f46e5` 严重脱节。

### 2.2 这是一个产品决策点（见第十节）

要么**实现真正的 light/dark 切换**（toggle + 持久化 + 修正 `.dark` 品牌色 + 把局部深色块改为 semantic token），要么**明确只做亮色**（删除全部失效 `dark:`、把 intentional 深色段用命名 token 表达）。当前"半套暗色"是最差状态。

---

## 三、设计 token 单源（结构性）

### 3.1 双 CSS 入口

```6:6:frontend/src/main.tsx
import './styles/site-globals.css'
```
```1:1:frontend/src/layouts/DashboardLayout.tsx
import '../styles/globals.css'
```

营销/登录/编辑器首屏只加载 `site-globals.css`；进入 Dashboard/Admin 才叠加 `globals.css`（含 shadcn 层、`.dark`、timeline 特效）。**同一 Tab 内路由切换会导致样式层叠不一致**，是断层的工程根因。

### 3.2 三套色板 + 两套圆角

| 来源 | 内容 |
|------|------|
| `globals.css` `@theme` + `:root` + `.dark` | shadcn 语义色，`--radius` 乘算刻度 |
| `site-globals.css` `@theme` | 重复语义色 + success/warning/danger，**另一套固定 radius** |
| `theme.ts:4-103` | 100+ `#hex`/`rgba`，无暗色映射 |
| `cursorLandingClasses.ts:4-27` | 第三套 `#f8fafc`/`#4f46e5` 硬编码 |

### 3.3 硬编码颜色（绕过 token）典型

- `marketingShellClasses.ts:5` `bg-[#f7f7f4]`（营销根背景，与 `--background #f8fafc` 冷暖不一致）
- `MKT_CTA_SECONDARY`(`marketingCta.ts:6`)/Footer CTA(`:37`) 写死 `bg-white`
- `HomeHeroSection.tsx:36,90` `bg-white/70`、Guide/Pricing 卡片 `bg-white/80`
- `HomeTimelineSection.tsx:101` 三段 hex 渐变；`ContextUsageBar.tsx:20-23` JS 色板内联 `style`（暗色无效）

---

## 四、排版 Typography

- **字体定义冲突**：`globals.css`/`site-globals.css` 用 Geist；`fonts.ts:3-4` 写 PingFang/宋体；`marketing-effects.css:325` `.mkt-font-display` 宋体；`index.html:7` 注释称"系统栈不依赖 Google Fonts"——四处说法不一。
- **字号无强制体系**：`typography.ts` 有阶梯但注释引用的 `--text-*` 在 CSS 中不存在；约 **50+ 文件**散落 `text-[Npx]`（`EditorSidebar.tsx:165` `text-[13px]`、`StoryMemoryModal.tsx:123` `text-[17px]`、`button.tsx:27` `text-[0.8rem]`）。
- 同类"辅助说明"既有 `text-xs` 又有 `text-[11px]`，字重 `font-semibold` 与 `font-medium` 混用。

---

## 五、间距与布局

- **容器宽度不统一**：Nav `max-w-7xl`(`MarketingNav.tsx:81`) vs section `max-w-6xl`(`HomeHeroSection.tsx:33`) → 滚动时 Logo/CTA 与正文不对齐；About/Footer `max-w-4xl`、Pricing `max-w-5xl`、Cursor story `max-w-[1120px]`。
- **section 纵向节奏忽大忽小**：`Feasibility py-28` → `ScrollStory py-20` → `Timeline py-28` → `Danmaku pt-16`。
- **圆角密度断层**：Dashboard 卡 `rounded-2xl`、Pricing `rounded-3xl`、Editor 按钮 `rounded-[10px]`。

---

## 六、按钮与组件协调

- `button.tsx` 变体齐全（default/outline/secondary/ghost/destructive/link + 8 种 size，基类 `rounded-xl`）。
- 但**裸 `<button>` 出现在约 48 个文件**：营销 CTA(`HomeHeroSection.tsx:64`)、`AuthSubmitButton`、Editor、Agent 时间线、Admin 移动卡。
- **Editor 自成体系**：`editorButtonClasses.ts:6,14` 用 `rounded-lg`/`rounded-[10px]`，违反 `DESIGN-TOKENS.md` 的 `rounded-xl` 约定。
- **三档高度**：`MKT_CTA_PRIMARY_LG`(`py-3.5 text-base`) vs `Button` default(`h-8`) vs `APP_BTN_MD`(`h-10`)。

---

## 七、组件归属 / IA

- 品牌组件 `NovelAiWordmark` 放在 `components/marketing/`，却被应用壳 `AppSidebar.tsx:13`、`AuthShell.tsx:4` 依赖 → 应提升到 `components/brand/`。
- `ui/card.tsx`（shadcn）**零引用**，实际用 `AppShellCard`——死组件。
- **多套并行**：Modal（`AppModalShell`/`AppSheetModal`/`StoryMemoryModal` 自定义/裸 `DialogContent`）、Spinner（`AppSpinner`/`BrandLoader`/`ShimmerScan*`）、Button（`Button`/`EditorButton` 17 变体/`AuthSubmitButton`/`MKT_CTA_*` 字符串）。
- 业务耦合进 ui 层：`DropdownSelect.tsx`/`EditorButton.tsx` 内联读 `editorTheme` 高度。

---

## 八、动画一致性

- **桌面 Hero demo 卡静止（已修）**：`MarketingChatOrchestrationDemo` 此前 `autoPlay=false` + IntersectionObserver 初值，桌面首屏可能永远 `elapsed=0`。**已改为 `variant === 'hero'` 时挂载即播**，移动端仍按性能策略静态。
- **方向未写反**：`shouldAnimate = !isMobile`（桌面开、移动关 rAF 循环）符合性能设计。
- **遗留不一致**：移动端 scroll 入场（framer `whileInView` + GSAP `useMarketingStoryReveal`）与弹幕 rAF **未与"移动减动效"策略对齐**，仍在动；而桌面 demo 循环靠 IO。建议统一一个"动效策略矩阵"（见规范）。
- **reduced-motion**：framer/CSS 多数已降级，但 `MarketingChatOrchestrationDemo` rAF 循环与 `DanmakuMarquee` 无 reduced-motion 分支。

---

## 九、国际化

- **覆盖率低**：仅约 21 个文件用 `useTranslation`（≈9%）；约 **62% TSX 硬编码中文**（Dashboard/Admin/Editor 主体）。
- **新 key 接线正确**（zh 默认下无 key 泄漏）：`cta.*`/`glossary.*` 调用的 namespace 前缀与 `useTranslation` 声明匹配，key 在 `zh/common.json` 齐全。
- **新 key 部分未接线**：`states.*` 与 `glossary.agent/subAgent/library` 等定义了但**无组件引用**（dead keys）。
- **品牌残留**：`RouteErrorBoundary.tsx:50-51` 仍硬编码 `Novel AI`；`index.html:8` 标题"小说创作助手 - AI Novel Writing"是第三套品牌表述。
- **en 缺口**：`en/marketing.json` 不存在；无语言切换器；若未来切 en 并 `loadNamespace('marketing','en')` 会 import 失败。
- **CTA 文案漂移**：新 `common:cta.registerFree`「免费注册」替换了原 `home.hero.ctaPrimary`「免费开始创作」——**文案实际变了**，需确认是否接受。

---

## 十、统一规范（实现唯一依据）

> 以下为目标态规范。实现时一切以本节为准，禁止再新增并行体系。

### 10.1 CSS 与 token
1. **单一 CSS 入口**：`main.tsx` 统一 `import globals.css`；合并 `site-globals.css` 的 `@theme`（保留 success/warning/danger），删除重复定义；**只保留一套 radius 刻度**。
2. **token 单源**：CSS 变量为唯一真相；`theme.ts` 只允许 `var(--*)` 或纯代码场景；删除 `cursorLandingClasses.ts` 内 hex；禁止新增 `bg-[#...]`/`text-[#...]`。

### 10.2 主题（待决策，见下方问题）
- 方案 A（推荐若要长期）：实现 toggle + `localStorage` + `prefers-color-scheme` 初值；修正 `.dark --primary` 为品牌 indigo；intentional 深色段改用 `bg-foreground`/语义 token。
- 方案 B（最小）：删除全部失效 `dark:`；只做亮色；深色段保留但用命名 token。

### 10.3 排版
- 用 Tailwind `@theme --text-*` 落实 `typography.ts` 阶梯；统一字体栈（确定 Geist 还是宋体 display）；**禁止新增 `text-[Npx]`**，存量分批映射到语义级别（Editor 高密度区可文档化例外）。

### 10.4 布局
- 营销统一 `max-w-6xl`（含 Nav）；section `py` 收敛为 2 档（如 `py-20 md:py-24`）；圆角主卡统一 `rounded-2xl`。

### 10.5 按钮
- 可点击主操作统一走 `Button` / `buttonVariants()`；`MKT_CTA_*` 改为 `cva` 扩展而非裸字符串；Editor `rounded-[10px]` 对齐 `rounded-xl`。

### 10.6 组件 IA
- `NovelAiWordmark` → `components/brand/`；删除零引用 `ui/card.tsx`（或全站接入）；新弹窗强制 `AppModalShell`/`AppSheetModal`。

### 10.7 动效策略矩阵
| 场景 | 桌面 | 移动 | reduced-motion |
|------|------|------|----------------|
| Hero demo 循环 | 挂载即播 | 静态 | 静态 |
| story demo 循环 | 进视口播 | 静态/单幕 | 静态 |
| scroll 入场(whileInView/GSAP) | 播 | **应与性能策略对齐（建议降级为 opacity-only 或关闭）** | 关闭 |
| 弹幕/Ambient | 播 | 降级/关闭 | 关闭 |

### 10.8 国际化
- 短期：补 `RouteErrorBoundary` 品牌、统一 `index.html` 标题、删除或接线 `states.*` dead keys。
- 中期：建立"应用壳硬编码中文 → i18n"迁移批次（Dashboard/Admin/Editor）；补 `en/marketing.json` 或明确暂不支持 en。

---

## 十一、实现批次建议（基于本规范）

```
批次 D1（结构地基，codex，串行不可并行）
  合并 CSS 入口 + token 单源 + 圆角/容器宽度统一（牵动 globals/site-globals/theme.ts）

批次 D2（视觉，gemini，依赖 D1）
  排版字号体系落地 + 按钮统一 + 硬编码颜色清理 + section 间距节奏

批次 D3（主题，依赖决策）
  按方案 A 或 B 实现暗色策略

批次 D4（动效对齐，codex）
  移动 scroll/GSAP 与性能策略对齐 + reduced-motion 补全

批次 D5（i18n，gemini）
  品牌残留收敛 + dead key 处理 + 应用壳硬编码迁移（分页面小步）
```

**关键约束**：D1 牵动全站 token，**必须单代理串行完成**，不可与 D2 并行，否则必然制造新的断层。

---

## 十二、待用户决策

1. **暗色主题**：实现完整 light/dark 切换（方案 A）/ 只做亮色并清理死 dark（方案 B）/ 暂缓。
2. **CTA 文案**：接受统一为「免费注册」/ 恢复「免费开始创作」/ 另定。
3. **派发范围与节奏**：先做 D1 地基，还是先做某一具体批次。
