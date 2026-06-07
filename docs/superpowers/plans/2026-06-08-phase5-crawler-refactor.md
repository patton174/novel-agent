# Phase 5 实施计划：爬虫 Agent 重构（借鉴 Scrapling / Firecrawl）

> 目标：把当前「双浏览器栈 + LLM 直读 HTML + 散落硬编码」的爬虫子系统，重构为 **单一抓取引擎 + 结构化抓取结果 + 可配置编排** 的工程化形态，借鉴 Scrapling 的统一 Fetcher/selector 抽取与 Firecrawl 的 scrape/map/extract 分层思想。
>
> 周期：约 2 周 ｜ 依赖：Phase 1~4 已完成 ｜ 侧：python-ai 为主，Java content 仅少量内部 API 适配。
>
> **重构方针（延续 Phase 1）**：彻底重构，不做新旧并存、不留兼容层。先删死代码，再收敛抓取路径，最后补测试与埋点。

---

## 现状问题清单（重构依据）

| 类别 | 问题 | 证据（路径） |
|------|------|------|
| 重复 | 双浏览器栈：Scrapling `StealthyFetcher` 与 Patchright `CrawlBrowserSession` 并行，FetchPage/SaveQueued 可能走不同路径 | `services/crawl_scrapling.py`、`services/crawl_browser.py`、`crawl_agent/tools/impl.py` |
| 重复 | HTML 清洗两份正则 | `crawl_browser.prepare_html_for_ai()` ≈ `crawl_scrapling.page_html()` |
| 重复 | `_append_log`/`_json_ok`/`_json_err` 在 `impl.py` 与 `catalog_impl.py` 各一份 | `crawl_agent/tools/*` |
| 死代码 | 整文件未引用 | `services/crawl_site_resolver.py` |
| 死代码 | `interpret_goal()` 从未调用 | `services/crawl_goal.py` |
| 死代码 | `discover_catalog`/`extract_catalog_from_page`/`resolve_page_navigation` 已被「LLM 读 HTML + QueueChapters」取代 | `services/crawl_ai_extractor.py` |
| 死代码 | `DiscoverChaptersInput` 无对应工具 | `crawl_agent/tools/schemas.py` |
| 死代码 | `set_catalog_cover(job_id)` 冗余（实际用 `set_catalog_cover_by_id`） | `services/crawl_content_client.py` |
| 脆弱 | `refresh_crawl_run_context` 硬替换 `messages[1]`，消息顺序变动即错 | `crawl_agent/prompting/run_context.py` |
| 脆弱 | `asyncio.create_task(execute_crawl_job)` 无队列/背压，Worker 重启丢 in-flight | `api/crawler_routes.py` |
| 脆弱 | `chapters_saved = max(..., sort_order)` 用序号当计数，跳章/乱序失真 | `crawl_agent/tools/impl.py` |
| 脆弱 | 编排器 `cycle_ctx.activeSourceUrls` 乐观更新，与 Java 短暂不一致 | `crawl_orchestrator/tools.py` |
| 硬编码 | 160/12 轮、20 章批、3 并发槽、8 编排轮、22k/24k 预算 | `loop.py`/`limits.py`/`orchestrator/*`/`memory.py` |
| 缺口 | 无 `loop.py`/`impl.py`/orchestrator 集成测试，无 mock Java API 的 E2E | `tests/` |

---

## 目标架构（Scrapling × Firecrawl）

```
crawl/
  engine/                      # 【新】统一抓取引擎（取代双浏览器栈）
    fetch_engine.py            # FetchEngine.scrape(url, ScrapeOptions) -> ScrapeResult
    modes.py                   # FetchMode = http | stealth | browser（自动升级 ladder）
    html_clean.py              # 唯一 HTML 清洗实现（合并两份正则）
    selectors.py               # Scrapling selector 封装：links()/main_text()/meta()
  agent/                       # 子任务 LLM 工具环（原 crawl_agent，瘦身）
    loop.py / loop_support.py
    context.py / memory.py / runtime_state.py
    prompting/run_context.py   # 改为标记定位注入，不再 messages[1]
    tools/
      base.py                  # 【新】公共 helper：log/json_ok/json_err/ctx 解析
      fetch_tools.py           # ScrapePage / MapLinks（结构化链接发现）
      catalog_tools.py         # InitNovel / Queue / SaveQueued / Catalog CRUD
      registry.py / schemas.py
  orchestrator/                # 主编排（原 crawl_orchestrator）
    scheduler.py               # 【新】队列 + 并发 + URL 去重（取代 prompt 3 槽 + 乐观 ctx）
    loop.py / client.py / context_builder.py / tools.py
  content_client.py            # Java content 内部 API（瘦身去重）
  config.py                    # 【新】爬虫所有可调参数（轮次/批量/并发/预算）
```

**对照锚点**

| 现状 | Scrapling 对齐 | Firecrawl 对齐 |
|------|---------------|---------------|
| 双浏览器栈 | 单一 `Fetcher`/`StealthyFetcher`/`DynamicSession` API | `scrape` mode enum（http/browser） |
| LLM 直读原始 HTML 找链接 | `page.css/xpath` selector 产出 structured links | `/map` 链接发现 与 LLM 规划分离 |
| `extract_chapter` 纯 LLM | selector 优先抽正文 + LLM fallback | `extract` schema / JSON 模式 |
| 工具返回字符串拼 JSON | — | 统一 `ScrapeResult`（html/text/links/markdown） |
| 编排 prompt 硬编码槽位 | — | 中心化 queue + concurrency + dedupe |

---

## 任务总览

| # | 任务 | 侧 | 验证 |
|---|------|----|------|
| T5.0 | 死代码 / 死依赖清理 | py | `ruff` 无 F401/未用；测试全绿 |
| T5.1 | 统一抓取引擎 `FetchEngine` + `FetchMode` 升级 ladder | py | 引擎单测 |
| T5.2 | `ScrapeResult` 统一返回（html/text/links/markdown） | py | 序列化单测 |
| T5.3 | `MapLinks` 结构化链接发现工具（selector + LLM 规划分离） | py | 工具单测 |
| T5.4 | 内容提取流水线：selector 优先 + LLM fallback + schema | py | 提取单测 |
| T5.5 | 工具层去重：抽 `tools/base.py` 公共 helper | py | 注册/调度单测 |
| T5.6 | 配置外置：所有硬编码进 `crawl/config.py` + settings | py | 配置单测 |
| T5.7 | 健壮性修复：run_context 标记注入 / 章节计数 / 任务背压 | py | 回归 + 新单测 |
| T5.8 | 编排器中心化 `scheduler`（队列+并发+去重） | py | 调度单测 |
| T5.9 | 集成测试：loop / 工具 / 编排（mock Java API E2E） | py | 新增集成测试绿 |
| T5.10 | 抓取可观测：成功率/blocked/stealth 升级/每章耗时 → Prometheus + trace_id | py | `/metrics` 可见新指标 |

> 执行顺序建议：T5.0 → T5.1/T5.2（引擎底座）→ T5.3/T5.4 → T5.5/T5.6 → T5.7/T5.8 → T5.9/T5.10。

---

## T5.0 — 死代码 / 死依赖清理

### 删除
- `services/crawl_site_resolver.py`（整文件，零 import）。
- `services/crawl_goal.py::interpret_goal()`（保留 `goal_from_config`）。
- `services/crawl_ai_extractor.py`：删 `discover_catalog`/`extract_catalog_from_page`/`resolve_page_navigation` 及其私有辅助（保留 `extract_chapter` 及其依赖）。
- `crawl_agent/tools/schemas.py::DiscoverChaptersInput`。
- `services/crawl_content_client.py::set_catalog_cover(job_id)`（保留 `_by_id`）。

### 验证
```bash
cd python-ai && ruff check app/ tests/        # 无 F401 / 未用 import
cd python-ai && python -m pytest tests/ -q     # 全量绿（删后无引用断裂）
```
> 删除前先 `rg "crawl_site_resolver|interpret_goal|discover_catalog|extract_catalog_from_page|resolve_page_navigation|DiscoverChaptersInput"` 确认零引用，删后跑全量回归。

---

## T5.1 — 统一抓取引擎 `FetchEngine`

### 设计
新增 `app/crawl/engine/fetch_engine.py`：

```python
class FetchMode(str, Enum):
    HTTP = "http"          # Scrapling Fetcher（curl_cffi impersonate）
    STEALTH = "stealth"    # Scrapling StealthyFetcher（headless chromium）
    BROWSER = "browser"    # Patchright 交互会话（SPA/点击/搜索）

@dataclass
class ScrapeOptions:
    mode: FetchMode | None = None      # None=自动升级 ladder
    formats: tuple[str, ...] = ("html",)  # html | text | links | markdown
    proxy: str | None = None
    timeout_ms: int | None = None
    reuse_session: bool = False        # browser 模式复用会话

class FetchEngine:
    async def scrape(self, ctx, url, opts: ScrapeOptions) -> ScrapeResult: ...
```

**升级 ladder（合并现有逻辑，单一入口）**：`http → (403/429/空页) → mihomo 节点轮换 → 代理候选链 → stealth → browser`。当 `opts.mode` 指定时跳过自动升级；`crawl_prefer_playwright` 改为「初始 mode=browser」配置项。

- 合并 `crawl_scrapling.fetch_page_with_retry` + `crawl_fetch.fetch_for_crawl` + `crawl_browser` 调用为 `FetchEngine`。
- `crawl_browser.CrawlBrowserSession` 保留为 BROWSER 模式后端，由引擎托管生命周期（统一 `finally` 关闭）。
- HTML 清洗合并到 `engine/html_clean.py`，`prepare_html_for_ai`/`page_html` 改为薄封装委托。

### 验证
```bash
cd python-ai && python -m pytest tests/test_crawl_engine.py -q
```
单测覆盖：mode 显式指定不升级；http→stealth 自动升级；403 不计 transport failure；browser 会话复用与关闭。

---

## T5.2 — `ScrapeResult` 统一返回

### 设计
`app/crawl/engine/fetch_engine.py`：

```python
@dataclass
class ScrapeResult:
    url: str
    http_status: int
    mode: FetchMode
    blocked: bool
    html: str = ""
    text: str = ""
    links: list[LinkItem] = field(default_factory=list)  # {text,url,kind}
    markdown: str = ""
    used_stealth: bool = False
    def to_tool_payload(self, max_preview=1500) -> dict: ...   # 工具层统一序列化
```
- 工具 `_json_ok/_json_err` 改为消费 `ScrapeResult.to_tool_payload()`，去掉散落字段拼装。
- `links` 由 `engine/selectors.py` 基于 Scrapling selector 产出（见 T5.3）。

### 验证
```bash
cd python-ai && python -m pytest tests/test_crawl_scrape_result.py -q
```

---

## T5.3 — `MapLinks` 结构化链接发现（Firecrawl /map 思想）

### 设计
当前目录发现完全靠 LLM 读 22k 原始 HTML，token 重、易漏。改为「**引擎先抽结构化链接，LLM 只做规划/筛选**」：

- `engine/selectors.py`：`extract_links(html, base_url)` 用 Scrapling `page.css('a')` + 启发式（章节序号、相邻 URL 模式、锚文本）输出 `LinkItem[]`，并按「疑似目录/章节/分页」分类。
- 新工具 `MapLinks(url)`：调用 `FetchEngine.scrape(formats=("links",))`，返回**结构化候选链接**（截断到 N 条，附 sort_order 猜测），写入 RUN_CONTEXT。
- LLM 据此 `QueueChapters`，不再被迫逐字读 HTML。原 `ScrapePage`（原 FetchPage）保留用于读正文/复杂页。

### 验证
```bash
cd python-ai && python -m pytest tests/test_crawl_maplinks.py -q
```
单测：相对链接补全、章节序号推断、分页识别、去重。

---

## T5.4 — 内容提取流水线（selector 优先 + LLM fallback）

### 设计
`extract_chapter` 当前纯 LLM。改为两级：
1. **selector 快路径**：常见正文容器（`#content`/`.read-content`/`article` 等）+ 站点 config 自定义 selector → 直接取正文，命中且字数达标则跳过 LLM。
2. **LLM fallback**：快路径不命中或字数不足时，走现有 LLM 清洗（schema 化输出 `{title, content}`）。

- 站点级 selector 存于任务 `site_config`，可由编排器/CRM 预置。
- 降低 LLM 调用量与成本，提升批量入库速度。

### 验证
```bash
cd python-ai && python -m pytest tests/test_crawl_ai_extractor.py -q
```
单测：selector 命中跳过 LLM；不命中回退；字数阈值校验。

---

## T5.5 — 工具层去重（`tools/base.py`）

### 设计
抽 `app/crawl/agent/tools/base.py`：`append_log(ctx, level, msg)`、`json_ok(**)`、`json_err(msg, **)`、`resolve_catalog_id(ctx)`、`crawl_proxy(ctx)`。`fetch_tools.py`/`catalog_tools.py` 统一引用，删除两处副本。`registry`/`tool`/`run_tool` 保持，按新目录归位。

### 验证
```bash
cd python-ai && python -m pytest tests/test_crawl_agent_registry.py tests/test_crawl_loop_support.py -q
```

---

## T5.6 — 配置外置

### 设计
新增 `app/crawl/config.py`（或并入 `app/config.py` 的 `CrawlSettings`），把硬编码集中为可配置（env 覆盖）：

| 配置 | 默认 | 原硬编码位置 |
|------|------|------|
| `CRAWL_MAX_TURNS` | 160 | `loop.py` |
| `CRAWL_PREVIEW_TURNS` | 12 | `loop.py` |
| `CRAWL_BATCH_SAVE` | 20 | `limits.py` |
| `CRAWL_ORCH_SLOTS` | 3 | `orchestrator` prompt |
| `CRAWL_ORCH_MAX_TURNS` | 8 | `orchestrator/loop.py` |
| `CRAWL_HTML_BUDGET` | 22000 | `impl.py` |
| `CRAWL_MEMORY_BUDGET` | 24000 | `memory.py` |

编排 prompt 中的「最多 3 个」改为从配置注入文案，避免 prompt 与代码漂移。

### 验证
```bash
cd python-ai && python -m pytest tests/test_crawl_config.py -q
```

---

## T5.7 — 健壮性修复

### 改动
1. **run_context 注入**：`refresh_crawl_run_context` 不再 `messages[1]` 硬替换；改为在 SystemMessage 后查找带 `__RUN_CONTEXT__` 标记的 HumanMessage，存在则替换、否则插入。消息结构变动不再破坏。
2. **章节计数**：`ctx.chapters_saved` 由 `max(sort_order)` 改为 `set[int]` 已存序号集合，`len(saved_set)` 作进度；跳章/乱序准确。
3. **任务背压**：`/internal/crawl/execute` 的 `asyncio.create_task` 改为提交到有界 `asyncio.Semaphore` 限流的执行器（或轻量内存队列），并记录 in-flight；超并发返回 429/排队。Worker 重启后由编排 daemon 重新拾取 RUNNING 任务（依赖 `runtime_state` 续爬）。

### 验证
```bash
cd python-ai && python -m pytest tests/test_crawl_run_context.py tests/test_crawl_progress.py -q
```

---

## T5.8 — 编排器中心化 `scheduler`

### 设计
新增 `app/crawl/orchestrator/scheduler.py`，把「并发槽位 + URL 去重」从 prompt/乐观 ctx 移到代码：
- `can_create_job(source_url) -> bool`：基于 Java 实时 activeJobs + 本地 in-flight 集合判定（槽位来自 `CRAWL_ORCH_SLOTS`）。
- `register_inflight(source_url)` / `release(source_url)`：原子去重，替代 `cycle_ctx.activeSourceUrls` 乐观写。
- `CreateCrawlJob` 工具先过 `scheduler.can_create_job`，不通过则返回明确「槽位满/重复 URL」。

### 验证
```bash
cd python-ai && python -m pytest tests/test_crawl_scheduler.py -q
```
单测：槽位满拒绝；重复 URL 拒绝；释放后可再建。

---

## T5.9 — 集成测试（mock Java API E2E）

### 设计
- `tests/test_crawl_loop_integration.py`：mock `FetchEngine`（返回固定目录页 + 章节页）+ mock `CrawlContentClient`，跑 `run_crawl_tool_loop`，断言 QueueChapters→InitNovel→SaveQueuedChapters→CompleteJob 全流程与入库调用次数。
- `tests/test_crawl_orchestrator_integration.py`：mock `OrchestratorClient`，断言一个 cycle 内 CreateCrawlJob 的去重与槽位行为。
- 用 `respx`/`httpx.MockTransport` mock Java content 内部 API（已是 httpx 客户端）。

### 验证
```bash
cd python-ai && python -m pytest tests/test_crawl_loop_integration.py tests/test_crawl_orchestrator_integration.py -q
```

---

## T5.10 — 抓取可观测

### 设计
复用 Phase 4 的 `prometheus_fastapi_instrumentator` 自定义指标 + `trace_id`：
- `crawl_fetch_total{mode,blocked}`、`crawl_fetch_duration_seconds{mode}`、`crawl_stealth_upgrade_total`、`crawl_chapter_saved_total`、`crawl_chapter_extract_duration_seconds{path=selector|llm}`。
- 在 `FetchEngine.scrape` / 入库路径埋点；日志带 `trace_id`（已有 `TraceIdMiddleware`）。

### 验证
```bash
cd python-ai && curl -s localhost:8000/metrics | rg crawl_fetch_total
```

---

## DoD（每个任务勾选前）
1. 代码完成，`ruff check` + `mypy` 通过。
2. 配套单测已写（正常 + ≥1 失败/边界），本模块实跑通过。
3. `python -m pytest tests/ -q` 全量回归绿（覆盖率门禁不下降）。
4. 关键抓取路径补埋点（T5.10）。
5. 删除项确认零引用后再删（T5.0）。

## 进度（实施时勾选）
- [x] T5.0 死代码 / 死依赖清理
- [x] T5.1 统一抓取引擎
- [x] T5.2 ScrapeResult
- [x] T5.3 MapLinks
- [x] T5.4 提取流水线
- [x] T5.5 工具层去重
- [x] T5.6 配置外置
- [x] T5.7 健壮性修复
- [x] T5.8 编排器 scheduler
- [x] T5.9 集成测试
- [x] T5.10 抓取可观测

---

## 实施复核与返工记录（2026-06-08）

### 质量复核结论
- `python -m pytest tests/ -q` 全量 **404 passed**（环境无 pytest-cov / ruff，覆盖率与 ruff 门禁未本地执行）。
- 新增爬虫测试：`test_crawl_engine`、`test_crawl_run_context`、`test_crawl_selectors`、`test_crawl_content_extract`、`test_crawl_scheduler`、`test_crawl_loop_integration`、`test_crawl_orchestrator_integration`。

### 返工 #1 — selector 提取在嵌套 HTML 下提前截断（P0）
- **缺陷**：`content_extract._regex_extract` 用非贪婪正则 `(.*?)</[^>]+>` 提取容器内文，遇到内部首个闭合标签（如 `</h1>`）即终止，导致 `HtmlBodyPage`（Playwright/stealth 抓取返回、无 `css` 方法）路径下正文几乎全部丢失、`extract_chapter_via_selector` 误判未命中并回退 LLM。
- **影响面**：生产中 Playwright/stealth 抓取的章节正文 selector 快路径基本失效，退化为全量 LLM，成本与速度均劣化（与 T5.4 目标相悖）。被 `test_extract_chapter_via_selector_id_content` 捕获（全量回归时暴露，单独跑 crawl 子集未触发）。
- **根因**：正则无法处理嵌套标签的标签平衡。
- **修复**：以标准库 `html.parser.HTMLParser` 实现标签平衡提取器 `_SelectorTextParser`，按 `#id` / `.class` / `tag` 选择器跟踪标签栈，正确收集目标节点全部内文，块级标签注入换行；无第三方依赖。
- **加固测试**：新增「深层嵌套多段落不截断且不越界兄弟节点」「class 选择器」「site_config 自定义 selector 优先」「字数不足返回 None」共 4 例。
- **验证**：`test_crawl_content_extract.py` 5 passed；全量 404 passed。

### 遗留 / 未达 DoD
- `ruff check` + `mypy`（DoD#1）、覆盖率门禁（DoD#3）本地环境缺工具，未执行——建议 CI 内补跑。
