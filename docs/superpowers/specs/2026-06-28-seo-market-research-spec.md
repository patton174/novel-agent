# SEO 专项优化 — 市场调研与策略规格

> **版本**：2026-06-28  
> **状态**：调研稿，待产品/运营评审  
> **站点**：https://www.novel-agent.cn  
> **关联**：`frontend-ui-audit.md`（§2.6 旧路由迁移）、`platform-growth-ops-spec.md`（M6 标题/图标）

---

## 1. 执行摘要

Novel Agent 定位是 **长篇网文/小说的 Agent 工作台**（项目上下文、记忆、工具执行、流式成稿），与通用对话 AI、纯「一键生成」工具、平台内嵌作家助手形成差异化。

**SEO 机会**：国内「AI 写小说 / 网文卡文 / 长篇设定一致性」搜索需求在 2025–2026 明显上升（DeepSeek 等词带动泛 AI 创作关注；垂直工具如蛙蛙写作、蛙趣拼文、阅文作家助手持续教育市场）。Novel Agent 尚未建立 **可被索引的技术基础**（无 sitemap/robots、无 meta description/OG、SPA 首屏 HTML 几乎为空），属于 **从零到 1** 阶段。

**建议主战场**：简体中文百度 + 必应（国内份额）+ 少量 Google（海外华人/英文创作者）。英文 SEO 为 P2，需单独关键词体系，不与中文直译。

**与 Geo 的关系（避免混淆）**：

| 维度 | 用途 | 当前状态 |
|------|------|----------|
| **风控 Geo** | `CF-IPCountry` 检测异地登录 | 已在 `studio-module-risk` 接入 |
| **SEO Geo** | 搜索引擎地域/语言信号（hreflang、GSC 地域、百度站长） | **未做** |
| **产品 Geo 锁区** | 按国家限制注册/支付 | **非本 spec 范围** |

SEO 不应「锁用户地区」，而是 **按市场投放内容与关键词**，让爬虫与用户各取所需。

---

## 2. 现状审计（代码基线）

### 2.1 已有

| 项 | 实现 |
|----|------|
| 路由级 `<title>` | `useDocumentMeta` + `routeDocumentMeta.ts` |
| `html lang` | 随 i18n 切换 `zh-CN` / `en` |
| 营销页结构 | `/` `/guide` `/pricing` `/about` + CMS 法律页 |
| 品牌 i18n | `marketing.json` zh/en |
| 旧 URL 301 | `/features`→`/guide`，`/testimonials`→`/about`（**无迁移说明页**） |

### 2.2 缺口（SEO 阻塞项）

| 优先级 | 缺口 | 影响 |
|--------|------|------|
| P0 | **纯 CSR SPA**，爬虫拿到空壳 HTML | 百度/Google 难以稳定收录正文 |
| P0 | 无 `meta description` / `canonical` / Open Graph / Twitter Card | SERP 摘要差、分享无图 |
| P0 | 无 `robots.txt` / `sitemap.xml` | 抓取预算浪费、新页发现慢 |
| P1 | 首页/Guide 大量内容在 JS 渲染 + 动画 demo | 有效文本密度低 |
| P1 | `descriptionKey` 在 meta 表定义但 **未写入 DOM** | 浪费已有 i18n |
| P1 | 无 JSON-LD（`SoftwareApplication` / `Organization`） | AI 摘要/富结果弱 |
| P2 | 无博客/教程/对比页等内容矩阵 | 长尾词无承载页 |
| P2 | 无百度站长 / GSC 基准数据 | 无法验证假设 |

### 2.3 与 UI 审计一致的产品问题（影响转化 + 停留）

- 子页缺底部 CTA 带（`MarketingShell` linksOnly）
- 法律页 eyebrow 硬编码中文
- Nav 与子页锚点策略不一致

SEO 流量进来后若漏斗断裂，会表现为 **高跳出 → 排名难维持**。

---

## 3. 竞品与市场格局

### 3.1 竞争象限

```
                    垂直网文工程化
                          ↑
         蛙蛙写作 / 蛙趣拼文 / 炼字工坊
                          |
    平台内助手 ←----------+----------→ 独立 SaaS 工作台
  (阅文作家助手、          |              ★ Novel Agent 目标位
   百度作家平台)           |
                          |
         笔灵AI / 灵犀速写（短篇/一键向）
                          ↓
                    通用大模型对话
              (ChatGPT / Claude / 豆包 / DeepSeek)
```

### 3.2 主要竞品 SEO 观察（2026 Q2）

| 竞品 | 定位 | 典型 SEO 打法 | 对 Novel Agent 启示 |
|------|------|---------------|----------------------|
| **蛙蛙写作** | 网文 Agent + 漫剧链路 | 品牌词 + 「AI写网文」「卡文」教程站群 | 强调 **多 Agent / 工具透明** 差异，避正面「漫剧」 unless 产品 roadmap 有 |
| **蛙趣拼文** | 桌面长篇 + 设定三系统 | 长尾 landing「AI写小说软件」「百万字设定不漂移」 | 我方已有 **Memory/章节 RAG**，可打「在线、免安装、Agent 托管」 |
| **阅文作家助手** | 平台内免费辅助 | 依托阅文域名权重，弱独立 SEO | 不打「投稿」，打 **跨平台私有项目** |
| **百度作家平台** | 创作+投稿+流量 | 百度系天然收录优势 | 内容需 **原创教程** 争取自然外链，不指望平台导流 |
| **笔灵AI / 灵犀速写** | 短篇/一键生成 | 「AI小说生成器」等高流量泛词 | 可截流但需落地页说明 **长篇/连载** 不适合一键党 |
| **Sudowrite** | 英文小说 | Google 英文长尾 | EN 市场 P2，学结构不学词 |

### 3.3 市场趋势（调研共识）

1. **从「生成」到「工程化」**：用户搜的不只是「AI 写小说」，而是「卡文怎么办」「设定崩了」「长篇一致性」——与 Novel Agent 产品叙事一致。
2. **AI 搜索 / 摘要**：段落清晰、有定义、有对比表的内容更易被 AI Overviews 引用（2026 新 SERP 形态）。
3. **视频引流反哺搜索**：竞品用短剧/口播获量；我方可先做 **文字教程 + B 站/小红书二次分发**，不必先做漫剧。
4. **合规与「AI 痕迹」**：用户关心平台审核与「像人写」——Guide 页可加 **「辅助创作、非代写」** 合规表述（法务审）。

---

## 4. 关键词调研（初版矩阵）

> 精确搜索量需 **百度指数 / 5118 / Ahrefs（EN）** 二次验证；下表为意图分级与优先级假设。

### 4.1 中文 — 核心词（Brand + Category）

| 意图 | 示例关键词 | 优先级 | 建议落地页 |
|------|------------|--------|------------|
| 品牌 | Novel Agent、novel agent 小说 | P0 | `/` |
| 品类 | AI 小说创作工具、AI 网文助手、智能写作助手 | P0 | `/` `/guide` |
| 痛点 | 网文卡文怎么办、AI 续写小说、长篇 AI 写作 | P0 | `/guide` + 未来 `/blog/*` |
| 功能 | 小说大纲 AI、角色设定管理、世界观 AI | P1 | `/guide#capabilities` 独立 H2 |
| 对比 | AI 写作软件对比、蛙蛙写作 alternative | P1 | 未来 `/compare/*` |
| 泛流量 | AI 写小说、AI 小说生成器 | P2 | 单独 landing，避免首页堆砌 |

### 4.2 中文 — 长尾（内容 SEO）

| 主题簇 | 示例 | 内容形式 |
|--------|------|----------|
| 连载工作流 | 「如何用 AI 续写上一章而不写崩」 | 3000 字教程 + 产品截图 |
| 设定管理 | 「百万字如何记住伏笔」 | 对比 Memory 树 vs 纯对话 |
| 平台向 | 「番茄/起点作者能否用外部 AI 助手」 | 合规中立指南（不带平台商标滥用） |
| 技术向 | 「什么是 Agent 写作」「SSE 流式成稿」 | 吸引进阶用户与外链 |

### 4.3 英文 — P2 词库（独立调研）

| 意图 | 示例 | 备注 |
|------|------|------|
| Category | AI novel writing assistant, fiction writing AI | 避开 Sudowrite 品牌词竞价 |
| Pain | writer's block AI, maintain story consistency | 对接现有 EN marketing.json |
| Feature | AI chapter continuation, story bible software | 与 Memory/Agent 对齐 |

**不要**中英文共用同一 URL 硬切换关键词；用 **hreflang + 独立 meta 文案**。

---

## 5. 地域与语言策略（SEO Geo）

### 5.1 目标市场假设

| 市场 | 搜索引擎 | 语言 | 优先级 |
|------|----------|------|--------|
| 中国大陆 | 百度、必应 | zh-CN | **P0** |
| 港澳台/海外华人 | Google | zh-Hant / zh-CN | P1 |
| 欧美独立作者 | Google | en | P2 |

### 5.2 技术信号（待实施）

```html
<!-- 每页 -->
<link rel="canonical" href="https://www.novel-agent.cn/guide" />
<link rel="alternate" hreflang="zh-CN" href="https://www.novel-agent.cn/guide?lang=zh" />
<link rel="alternate" hreflang="en" href="https://www.novel-agent.cn/guide?lang=en" />
<link rel="alternate" hreflang="x-default" href="https://www.novel-agent.cn/guide" />
```

- **百度**：站长平台提交 sitemap、普通收录 API、留意 ICP 备案页链通。
- **Google Search Console**：地域 targeting 选「中国」+ 国际英文属性分 property。
- **Cloudflare**：已接 CF；SEO 与风控共用 `CF-IPCountry`，但 **不要在 SSR 层对爬虫做地域拦截**。

### 5.3 与风控 Geo 的边界

- 风控：CN 用户 + 短期 US IP → 可能 step-up；**不影响**爬虫（无 JWT、无 session）。
- SEO：确保 `Googlebot`/`Baiduspider` UA 不被 WAF/Bot Fight **误伤**（Cloudflare 规则 allowlist 搜索引擎 UA + 验证 IP 段）。

---

## 6. 内容信息架构建议

### 6.1 现有页面 SEO 角色

| URL | 角色 | 优化方向 |
|-----|------|----------|
| `/` | 品牌 + 品类首页 | 首屏 H1 含品类词；静态摘要段；FAQ schema |
| `/guide` | 深度功能/场景 | 拆 H2：续写、记忆、Agent  trace；内链 pricing |
| `/pricing` | 交易型 | 已有 FAQ；加 `Product` schema |
| `/about` | 信任/E-E-A-T | 团队、合规、联系方式 |
| `/privacy` `/terms` | 信任 | 全 i18n；canonical 稳定 |

### 6.2 建议新增（P1–P2）

| 路径 | 目的 |
|------|------|
| `/blog` 或 `/learn` | 长尾教程 hub |
| `/compare/wawa-writing` 等 | 截流对比（客观、可法务审） |
| `/use-cases/fanfiction` `/xuanhuan` 等 | 场景 landing（controlled 数量） |
| `/changelog` |  freshness 信号 + 回流 |

### 6.3 旧路由迁移（SEO 债务）

`/features`、`/testimonials` 301 已存在，建议：

1. 各旧 URL **保留 301 ≥12 个月**；
2. Search Console / 百度站长提交「地址变更」；
3. 在 `/guide` / `/about` 增加一句「原功能页已合并至…」供用户感知（非必须 for SEO，降跳出）。

---

## 7. 技术 SEO 路线图（与实现对齐）

### Phase 0 — 测量基线（1 周）

- [ ] 注册百度站长、Bing Webmaster、Google Search Console
- [ ] 导出竞品 Top 50 关键词（5118 / 站长之家）
- [ ] Lighthouse SEO 审计 + 「Fetch as Google/Baidu」看渲染后 DOM

### Phase 1 — 索引基础设施（2 周，工程）

- [ ] 静态 `robots.txt`、`sitemap.xml`（营销页 + CMS 法律页；**exclude** `/dashboard` `/admin` `/editor`）
- [ ] 扩展 `useDocumentMeta`：`description`、`canonical`、`og:*`、`twitter:*`
- [ ] 营销页 **预渲染或 SSG**（Vite SSR/prerender 插件 或 CF Workers 对 `/` `/guide` `/pricing` `/about`）
- [ ] JSON-LD：`WebSite` + `SoftwareApplication` on `/`

### Phase 2 — 内容 SEO（4–8 周，运营+产品）

- [ ] 4 篇支柱文章（卡文、设定、续写、Agent vs 聊天）
- [ ] 中文 meta 标题/描述 A/B（≤30 字 title，≤80 字 description 百度习惯）
- [ ] 内链：页脚 + Guide 正文链到 pricing/register

### Phase 3 — 增长闭环（持续）

- [ ]  B 站/小红书/知乎摘要回链
- [ ]  Affiliate/邀请码页 `rel=sponsored` 规范
- [ ] 季度复盘：收录量、品牌词、长尾排名、注册来源 `utm_source=organic`

---

## 8. Meta 文案草案（zh，待运营定稿）

| 页面 | Title（≤30 汉字） | Description（≤80 汉字） |
|------|-------------------|-------------------------|
| 首页 | AI 小说创作助手 \| Novel Agent | 专为长篇网文打造的 Agent 工作台：章节续写、设定记忆、工具透明执行。免费注册体验流式成稿。 |
| 指南 | 创作指南 \| AI 网文工作流 \| Novel Agent | 从世界观到章节续写：了解 Memory、Agent 工具链与适用场景，解决卡文与设定漂移。 |
| 定价 | 定价方案 \| Novel Agent | 按创作强度选择套餐，透明额度，无隐藏费用。免费版可体验完整 Agent 流程。 |

英文版需 **意译** 非直译（P2）。

---

## 9. KPI 与验证清单

| 指标 | 3 个月目标（保守） | 工具 |
|------|-------------------|------|
| 营销页收录数 | ≥6 URL 百度+Google 收录 | GSC / 百度站长 |
| 品牌词首位 | 「Novel Agent」百度前 3 | 手动+Rank 工具 |
| 非品牌曝光 | ≥50 展示/周（长尾合计） | GSC |
| 自然注册占比 | 可测量（`utm` + referrer） | 自建 analytics |
| 爬虫错误 | 5xx/403 对 bot 为 0 | CF + 日志 |

---

## 10. 待决问题（评审输入）

1. **主定位词**：对外统一「AI 小说创作助手」还是「网文 Agent」？（影响 H1 与外链锚文本）
2. **对比页**：是否允许点名蛙蛙/蛙趣？需法务口径。
3. **预渲染范围**：仅营销 4 页 vs 含 CMS 动态页（`/privacy` 等）？
4. **英文市场**：2026 是否投入 EN SEO，还是仅 i18n 产品界面？
5. **内容生产**：运营撰稿 vs Agent 辅助生成+人工审（注意百度清风算法对 AI 农场打击）。
6. **博客 CMS**：复用 `site-content` 还是新建 `blog` 表？

---

## 11. 建议下一步（本仓库）

| 顺序 | 动作 | 负责 |
|------|------|------|
| 1 | 产品/运营评审本 spec §10 待决项 | 产品 |
| 2 | 5118/百度指数拉数验证 §4 关键词 | 运营 |
| 3 | 工程 Phase 1：`useDocumentMeta` 增强 + sitemap/robots | 前端 |
| 4 | 营销页 prerender POC（`/guide` 优先） | 前端 + DevOps |
| 5 | 首篇支柱文：《如何用 Agent 续写而不写崩人设》 | 运营 |

---

## 附录 A — 参考文献与链接

- 竞品：蛙蛙写作、蛙趣拼文、阅文作家助手、百度作家平台
- 内部：`frontend/src/hooks/useDocumentMeta.ts`、`frontend/src/config/routeDocumentMeta.ts`
- UI/SEO 债务：`docs/frontend-ui-audit.md` §2.5–2.6
- 风控 Geo（非 SEO）：`studio-module-risk` / `CF-IPCountry`
