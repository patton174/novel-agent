# 营销站 / 全站 UI 样式优化 — 专业实施提示词

> **用途**：复制下方「完整提示词」块给 AI 助手或前端开发者，作为单次迭代的任务说明。  
> **设计基调**：Pixel-Punk Neo-Brutalism（粗边框、网格底、霓虹点缀、像素字 + 等宽正文）。  
> **仓库**：`frontend/`（Vite + React + Tailwind v4 + i18next + `themeStore`）

---

## 完整提示词（可直接复制）

```
你是一名资深前端工程师，负责 Novel Agent（小说创作 Agent 产品）的 UI/UX 打磨。
技术栈：React 18、Tailwind CSS v4、Framer Motion、GSAP ScrollTrigger、i18next、自研 PixelText 点阵字组件。


### 背景与现状

1. **首页 Hero**（`HomeHeroSection.tsx`）两行 `PixelText` 目前同为 `cell={28}`，视觉权重接近，主次不清。
   - 上行（副标题感）：`home.hero.title`
   - 下行（主标题感）：`home.hero.titleAccent`（品牌主句，应更醒目）

2. **英文像素字偏扁**：`PixelText` 已接入 5×7 字模（`glyphs5x7.ts`），大 cell + `fill` + `dotRange` 下英文仍显横向拉伸、纵向压缩。详见 `docs/superpowers/specs/2026-06-21-pixel-text-english-bitmap-design.md`。

3. **Story 左侧文案标题未像素化**（重要）：
   - `MarketingStoryCopy.tsx` 中 act 编号 `01` 已用 `PixelText`，但 **主标题**（`title` / `titleAccent`）仍走 `STORY_TITLE` / `mkt-font-display` 衬线体，与全站 Pixel-Punk 不一致。
   - 要点列表 `strong` 也未统一为像素强调样式。

4. **编排演示区未像素化 + 未 i18n**：
   - 左侧文案 i18n 已走 `marketing.json` → `HomeScrollStory` → `MarketingChatScene` → `MarketingStoryCopy`
   - 右侧 `MarketingChatOrchestrationDemo.tsx` 内 `SCENE_COPY` **硬编码中文**，英文 locale 仍显示中文
   - 演示框样式偏圆角聊天 UI，非 Neo-Brutalism

5. **暗色主题不完整**：营销页、演示框、网格背景、`ORCH_DEMO_`* 等在 `dark:` 下未系统验收。

6. **时间线位置与形态（重要纠正）**：
   - ❌ **错误理解**：把纵向时间线做在右侧演示框 *内部*（当前 `ORCH_DEMO_TIMELINE` 仅是 demo 内小列表）。
   - ✅ **正确目标**：在 **左侧文案** 与 **右侧编排动画** 之间，增加 **独立中间栏「滚动时间线」**——三列布局：`文案 | 时间线主轴 | 演示`。
   - 时间线节点与左右内容 **交错对齐**（staggered）：例如节点 1 与左侧 bullet 1 同高、节点 2 与右侧 demo 内「思考」块同高，形成「左文—中线—右动」的阅读节奏，而非两侧割裂。
   - 随页面向下滚动，中间竖线按 scroll progress **向下延伸**，已完成节点依次点亮；右侧 demo 播放进度与 scroll progress **同步或分段映射**，而非纯 `setInterval` 循环独跑。
   - 参考真实产品时间线形态：`frontend/src/components/agent/timeline/`（只读借鉴，勿引入 store/SSE）。

**当前布局**（`cursorFeatureGridClass`）：`md:grid-cols-[0.9fr_1.1fr]` 两列，无中间时间线。

---

### 任务 1：暗色主题全站适配

**要求**
- 以 `html.dark` / `themeStore` 为唯一主题源；禁止硬编码 `#fff`/`#000`/`#e2e8f0` 导致暗色穿帮（含 `cursorLandingClasses.ts` 内遗留色值）。
- **范围**：营销首页全 section、子页 Hero、登录/注册、Dashboard、编辑器侧栏与 Agent 面板、Admin CRM。
- 网格背景（`pixel-grid-bg-faint`、`mkt-grid-bg`）、玻璃 pill、演示外框、`marketing-timeline-`* 竖线在暗色下重定义 border / shadow / surface。
- `PixelText` / `PixelField` 暗色切换后无需刷新即重绘。
- 验收：`/`、`/login`、`/dashboard` 亮暗对比；正文对比度 ≥ 4.5:1。

**关键文件**：`frontend/src/styles/`、`themeStore.ts`、`marketing/**/*.tsx`、`lib/cursorLandingClasses.ts`

---

### 任务 2：英文像素字体「扁」的问题

**要求**
- 英文可读性 + 方块感；纵横比接近经典 5×7（高略大于宽）。
- 可调：`glyphs5x7.ts` 字模、`PixelText` 的 cell/dot/glyphGap/wordGap、英文与中文回退分轨参数。
- 回归：Hero、Story intro、**Story 左侧 Pixel 标题**、要点 highlight——中英文 locale 均测。
- 不引入外部像素 Web Font。

**关键文件**：`PixelText.tsx`、`glyphs5x7.ts`

---

### 任务 3：Story 左侧文案 — 标题像素化

**要求**
- `MarketingStoryCopy` 将 `STORY_TITLE` / `STORY_TITLE_ACCENT` 衬线标题改为 **`PixelText`**（与 Hero 主次规则一致，但尺寸适配 Story 栏宽）：
  - `title`：较小 cell（如 16–20）、`text-ink` 或弱化色
  - `titleAccent`：较大 cell（如 22–28）、`text-primary`
- 保持 `h3` 语义；`act` 编号继续 `PixelText size="sm"`。
- 要点 `highlight` 可选用 `PixelText size="xs"` 或保留 mono + 像素方块 bullet，与中间时间线节点视觉呼应。
- `alignEnd`（copy-right 布局）时像素字仍右对齐或 `items-end`，不破坏交错时间线对齐。

**关键文件**
- `frontend/src/components/marketing/story/MarketingStoryCopy.tsx`
- `frontend/src/lib/cursorLandingClasses.ts`（`STORY_TITLE`* 可废弃或仅作 spacing wrapper）

---

### 任务 4：中间滚动时间线（左文 | 中线 | 右演）

**要求**

**布局**
- 扩展 `MarketingChatScene` / `cursorFeatureGridClass` 为 **三列**（桌面）：
  - 左：`MarketingStoryCopy`（约 0.85fr）
  - 中：**`MarketingStoryTimeline`** 新组件（固定窄栏，如 48–72px，含竖线 + 方块节点）
  - 右：`MarketingChatOrchestrationDemo`（约 1.1fr）
- `copy-right` 时三列顺序镜像：演示 | 中线 | 文案（中线仍在「文案与演示之间」）。
- 移动端：中线置于文案与演示 **之间** 纵向排列，或缩为左侧细条时间线，禁止只在 demo 内部画竖线代替。

**交错感（stagger）**
- 每个 act 定义 3–5 个 **timeline step**，与左侧 `points[]` 和右侧 demo 阶段一一映射，例如：
  - Step 0：用户意图 → 左 lead / 右 composer 输入
  - Step 1：编排启动 → 左 point 1 / 右「编排中」
  - Step 2：思考 → 左 point 2 / 右 think 块
  - Step 3：工具 / 输出 → 左 point 3 / 右 tool + output
- 节点在竖线上 **错落偏移**（奇数步略向左探、偶数步略向右探，或用小折线连到左右），强化「交错」而非笔直一条线。
- 新 class 前缀：`marketing-timeline-rail`、`marketing-timeline-node`、`marketing-timeline-connector`。

**滚动联动**
- 在 `MarketingChatScene` 的 `section` ref 上用 `useScroll` / ScrollTrigger 计算 `progress ∈ [0,1]`。
- `progress` 驱动：① 中间竖线 `scaleY` 或 `height`；② 节点 active/done 状态；③ 右侧 demo 的 `elapsed` 或阶段索引（替换或叠加现有 `useVisiblePlayback` 的纯 timer）。
- `prefers-reduced-motion`：静态展示全部节点为完成态，竖线满高，demo 展示终态帧。
- 离开视口可暂停 progress；重新进入策略在 PR 中说明。

**关键文件**
- `frontend/src/components/marketing/demo/MarketingChatScene.tsx`（布局编排）
- `frontend/src/components/marketing/story/MarketingStoryTimeline.tsx`（新建）
- `frontend/src/lib/marketingStoryTimelineClasses.ts`（新建）
- `frontend/src/lib/cursorLandingClasses.ts`（三列 grid）
- `frontend/src/components/marketing/scroll/useMarketingStoryReveal.ts`（可与 GSAP 共存）

---

### 任务 5：右侧演示区 — 像素风格 + i18n

**要求**
- `MarketingChatOrchestrationDemo` + `marketingOrchestrationDemoClasses.ts` 改为像素 Neo-Brutalism：直角 2px 边框、阶梯阴影、方块状态点；**去掉圆角气泡**（`rounded-[18px]` 等）。
- 演示区 **不再承担「主时间线」职责**——内部 `ORCH_DEMO_TIMELINE` 可精简为右侧面板内的步骤摘要，与中间主轴分工明确。
- **i18n**：删除 `SCENE_COPY`；文案迁入 `marketing.json` → `home.story.demo.{think|orchestrate|subagent|stream}.`*；`think` / `orchestrate` / `subagent` / `stream` 四场景 + 子代理面板全覆盖；英文 locale **零中文**。
- `variant="hero"` 与 `variant="story"` 共用 i18n key。

**关键文件**
- `MarketingChatOrchestrationDemo.tsx`
- `marketingOrchestrationDemoClasses.ts`
- `i18n/locales/{zh,en}/marketing.json`

---

### 任务 6：首页 Hero 大标题主次层级

**要求**
- `home.hero.title`：更小 cell（18–21）、弱化色、`dot` 略小
- `home.hero.titleAccent`：更大 cell（32–40）、`text-primary`、`dotRange` 上限可加大
- 两行间距收紧；`sr-only` h1 不变；中英文 locale 断句检查

**关键文件**：`HomeHeroSection.tsx`、`marketing.json` → `home.hero`

---

### 约束

- 不修改后端 API；不改变 `PixelText` 对外 props 的破坏性签名（可新增可选 props）。
- 不删除 `HomeScrollStory` / GSAP 故事结构；在其上增强三列 + 中线。
- 中间时间线 **必须** 位于左文案与右演示之间，且有交错感；**禁止** 仅把竖线画在 demo 内部当作完成。
- 运行 `cd frontend && npm run lint && npm test`；附亮/暗 + zh/en 截图。

### 验收清单

- [ ] 暗色：首页、登录、Dashboard 无穿帮；主题切换即时生效
- [ ] 英文像素字：Hero / Story 标题不再「扁」
- [ ] **Story 左侧 `title` / `titleAccent` 已改为 PixelText**，非衬线体
- [ ] **中间时间线**：位于左文案与右演示之间；滚动时竖线延伸；节点与左右内容交错对齐
- [ ] 右侧演示：像素风格；en/zh i18n 无中文泄漏
- [ ] Hero：副标题明显小于主标题
请在 **不改变业务逻辑与路由** 的前提下，完成以下视觉与交互优化。修改应遵循仓库现有约定（`mkt-`* / `orch-demo-*` / `pixel-*` / `marketing-timeline-*` class 体系），并补齐暗色主题与国际化缺口。

```

---

## 附录：问题与代码映射


| 用户反馈            | 主要入口                                                         | 备注                              |
| --------------- | ------------------------------------------------------------ | ------------------------------- |
| 暗色主题全面适配        | `themeStore`、全站 `dark:` token                                | 含 `cursorLandingClasses` 硬编码色   |
| 英文像素字偏扁         | `PixelText` + `glyphs5x7.ts`                                 |                                 |
| **左侧标题未像素化**    | `MarketingStoryCopy.tsx`                                     | `STORY_TITLE` → `PixelText`     |
| **时间线在中间、有交错感** | 新建 `MarketingStoryTimeline` + 改 `MarketingChatScene` 三列 grid | ❌ 非 demo 内 `ORCH_DEMO_TIMELINE` |
| 右侧演示像素化 + i18n  | `MarketingChatOrchestrationDemo`                             | `SCENE_COPY` 待迁移                |
| 首页 Hero 主次      | `HomeHeroSection.tsx`                                        | 两行 `cell` 分离                    |


## 布局示意（桌面 · copy-left）

```
┌─────────────────┬──┬──────────────────────────┐
│ MarketingStory  │ │ │ MarketingChat            │
│ Copy            │█│ │ OrchestrationDemo        │
│ · act 01        │█│ │  (编排动画 / 流式 mock)   │
│ · Pixel title   │●│ │                          │
│ · bullets       │█│ │                          │
│                 │●│ │                          │
└─────────────────┴──┴──────────────────────────┘
                  ↑
           中间滚动时间线（竖线 + 错落节点）
           节点与左 bullet / 右 demo 阶段交错对齐
```

## 参考截图（问题复现）

- Hero 两行同大、英文偏扁
- Story act 01：左侧标题为衬线体非像素字；右侧圆角聊天 demo；**缺少中间时间线栏**

