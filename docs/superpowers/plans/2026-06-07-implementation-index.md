# 架构升级实施总索引

> ⚠️ **历史设计记录**。生产已迁移至 **novel-studio 单体**，现状以 `CLAUDE.md` / `.cursor/rules/project-architecture.mdc` 为准。本文保留作历史参考，**勿据以部署**（旧微服务 agent-gateway/auth/pyai/content/consumer 与 `restart-dev.sh` 均已废弃）。

> 配套设计文档：`docs/2026-06-07-architecture-upgrade.md`
>
> 本文是「无脑实施」级别的执行总索引。每个 Phase 是一份独立 plan 文件，可独立交付、独立回滚。**每个任务都附带单测要求与验收命令**。

---

## 阅读顺序

1. 先读 `docs/2026-06-07-architecture-upgrade.md`（现状 + 方案 + KPI）。
2. 再读本文（总索引 + 通用纪律）。
3. 按 Phase 顺序执行对应 plan：
   - `2026-06-07-phase1-tools-api.md` — 工具全量 API 化 + RAG 持久化止血（最高 ROI）
   - `2026-06-07-phase2-knowledge-base.md` — 知识库打通 + 知识图谱
   - `2026-06-07-phase3-harness-persistence.md` — Harness 统一 + 持久化 + Java 优化 + 记忆
   - `2026-06-07-phase4-engineering-deploy.md` — 工程化 + CI/CD + 部署 + 可观测
   - `2026-06-08-phase5-crawler-refactor.md` — 爬虫 Agent 重构（Scrapling/Firecrawl 思想）
   - `2026-06-08-phase6-frontend-optimization.md` — 前端适配 + 安全化 + 深度分包
   - `2026-06-08-phase7-structure-refactor.md` — 结构工程化（Python 爬虫统一包 `app/crawl/` + Java `agent-service`/`agent-document` 聚合）
   - **Phase 8–10（平台运营，2026-06-08 新增）** — 设计规格：`docs/superpowers/specs/2026-06-08-platform-operations-design.md`
     - `2026-06-08-phase8-infra-operations.md` — 基础设施运营（可观测、Flyway、备份、Milvus、Staging、E2E）
     - `2026-06-08-phase9-product-billing.md` — 产品计量、配额、计费与用户用量透明
     - `2026-06-08-phase10-admin-operations.md` — 管理运营、站点 CMS、审计、支付与功能门控

---

## 通用纪律（每个任务必须遵守）

### 测试命令速查

```bash
# python-ai（pytest + pytest-asyncio，asyncio_mode=auto）
cd python-ai && python -m pytest tests/ -q                 # 全量
cd python-ai && python -m pytest tests/test_xxx.py -q      # 单文件

# frontend（Vitest）
cd frontend && pnpm test                                   # 全量
cd frontend && pnpm exec vitest run src/xxx.test.ts        # 单文件
cd frontend && pnpm tsc --noEmit                           # 类型检查

# Java（JUnit）
cd novel-agent && mvn -B test                              # 全量
cd novel-agent && mvn -B -pl agent-content test            # 单模块
```

### 任务完成定义（DoD）

每个 task 勾选 ✅ 前必须满足：
1. 代码完成 + 通过 lint/typecheck。
2. **配套单测已写**（正常路径 + ≥1 失败/边界路径）。
3. 本模块测试本地实跑通过。
4. 全量回归测试不破坏。
5. 关键路径补埋点。

### 重构方针（用户明确）

**Phase 1 是彻底重构，不做新旧并存、不留兼容层、不做 A/B 灰度。** 重写工具层、重组目录、删除死代码。只借鉴 CC 的循环/注册架构风格，不照抄工具集。有用工具（WebSearch/MCP/Skill）改造为真实 API；无用 stub（Brief/Task*/Notebook/ToolSearch/VFS 路径门面）直接删除。

### 配置项（非灰度开关，是能力配置）

| 配置 | 位置 | 含义 |
|------|------|------|
| `RAG_EMBED_PROVIDER` | `python-ai` env | `openai` \| `bge_local`（embedding 提供方，独立于 chat） |
| `RAG_EMBED_API_KEY` / `RAG_EMBED_BASE_URL` | `python-ai` env | 独立 embedding 端点 |
| `WEB_SEARCH_API_KEY` | `python-ai` env | WebSearch 真实 API（无则工具返回明确「请配置」） |
| `MCP_SERVERS` | `python-ai` env | MCP 客户端服务器列表 |
| `KG_ENABLED` | `python-ai` env | 知识图谱抽取与检索（Phase 2） |
| `agent.runtime.mode` | Java Nacos | `legacy` \| `queued`（Phase 3 统一为 queued） |

> RAG 检索为 **Milvus-only**（无 memory/milvus 双模式开关，内存主存与 hash 兜底已删除）。

### 目录重命名映射（Phase 1 执行后生效）

Phase 1 会把 `agent_step/` 重组为领域语义的 `agent/`。**后续 Phase 2/3/4 的 plan 中为便于对照当前代码，仍使用重命名前的路径**（如 `agent_step/query_loop.py`）；实施到该阶段时按下表换算：

| 重命名前 | 重命名后（**已完成**） |
|----------|------------------------|
| `agent_step/query_loop.py` | `agent/loop.py` |
| `agent_step/query_loop_support.py`、`run_session.py`、`message_history.py` 等 | `agent/harness/*` |
| `agent_step/context_compact*.py`、`prompting/` | `agent/context/*` |
| `agent_step/worker/*` | `agent/harness/worker/*` |
| `agent_step/tools/sse_bridge.py` | `agent/streaming/sse_bridge.py` |
| `agent_step/vfs/chapter_store.py`、`memory_store.py` | `agent/backend/chapter_store.py`、`memory_store.py`（`chapter_client`/`memory_client` shim） |
| `agent_step/` 整目录 | **已删除**（无兼容层） |

### 删除职责划分（避免重复）

| 阶段 | 删除范围 |
|------|----------|
| Phase 1 | 工具层路径门面（`tools/cc/`、`vfs/paths.py` 等）、无用 stub（Brief/Task*/Notebook/ToolSearch）、legacy 别名、双实现工具批 |
| Phase 3 | 遗留 agents（`novel_graph.py`、`choice_gate.py`；`base.py`/`continuer.py`/`generation.py` 已随续写 API 删除）、`sse_bridge` 拆分 |

---

## Phase 依赖关系

```
Phase 1 (工具API化 + RAG止血)  ──┬──► Phase 2 (知识库 + 图谱)
        独立，最高优先          │
                                └──► Phase 3 (Harness/持久化/Java) 可与 P2 并行
Phase 4 (工程化/CI/部署/可观测) ── 可与 P1~P3 并行，但 CI 门禁建议 Phase 1 即引入

Phase 8 (基础设施运营) ──► Phase 9 (计量计费) ──► Phase 10 (管理运营/支付)
        │                         ▲
        └── Flyway baseline 必须先于 Phase 9 DB 迁移
Phase 8 与 Phase 9 前期可并行（ observability / Milvus 与 billing 模块开发）
```

**建议节奏**：Phase 1（1-2 周）→ Phase 2 与 Phase 3 并行（2-3 周）→ Phase 4 全程穿插，收尾固化。  
**平台运营（Phase 8–10）**：约 12 周，可与业务迭代并行；优先 **Phase 8 T8.1 Flyway** → **Phase 9 计量闭环** → Phase 10 管理/支付。

---

## 进度总览（实施时勾选）

- [x] Phase 1 完成（工具 API 化、`agent_step` 迁移、Milvus RAG）
- [x] Phase 2 完成（catalog 索引 MQ、hybrid 检索、KG 管道、`SearchKnowledge`/`GetCharacterGraph`；续写 API 已删除）
- [x] Phase 3 完成（Harness 统一、durable checkpoint、Java reactive/Redis 事件日志/记忆增量/有界线程池）
- [x] Phase 4 完成（CI 三语言门禁、Actuator/Prometheus、trace_id、rollback.sh、告警模板）
- [x] Phase 5（爬虫重构：统一抓取引擎、MapLinks、selector 提取、编排 scheduler、集成测试）
- [x] Phase 6（前端：统一骨架、根除三层叠加、深度分包、响应式、安全加固）
- [x] Phase 7（结构工程化：Python 爬虫统一包 L2、Java `agent-service` 聚合 + `agent-document` 模块）
- [ ] Phase 8（基础设施运营：Flyway、备份、Prometheus/Grafana/Loki、Milvus 生产、Staging、E2E、CSP/Sentry）
  - [x] Phase 8 T8.1（2026-06-08）：auth/content Flyway baseline + `ddl-auto=validate`
  - [x] Phase 8 T8.2（2026-06-08）：PostgreSQL backup/restore 脚本
- [ ] Phase 9（产品计量计费：`agent-billing`、usage_event、配额拦截、Billing/Pricing 真数据、run 追溯）
  - [x] Phase 9 首批（2026-06-08）：`agent-billing` 模块 + Flyway 表 + API；PyAI 配额；python 上报；前端 Pricing/Billing 接 API
- [ ] Phase 10（管理运营：Admin 套餐/成本/CMS/审计/系统参数、支付 webhook、发票、功能门控）
  - [x] Phase 10 首批（2026-06-08）：Admin 套餐 CRM API + `/admin/plans` 管理页
  - [x] Phase 10 第二批（2026-06-08）：用户订阅/用量 CRM + 临时配额；`/admin/revenue` 收入成本看板
  - [x] Phase 10 第三批（2026-06-08）：站点 CMS + 审计日志 + 仪表盘公告
  - [x] Phase 10 第四批（2026-06-08）：系统参数 KV + Admin `/admin/system-settings` + 注册维护态
  - [x] Phase 10 T10.7a（2026-06-08）：Pricing/Billing「联系升级」手工运营文案
  - [x] Phase 10 T10.9（2026-06-08）：`/dashboard/settings` 账户设置页恢复
  - [x] Phase 10 T10.10（2026-06-08）：plan_feature 门控（AI 封面 custom_model、TXT/PDF 导出）

---

## Phase 4 收尾质量复查 + 清理（2026-06-08）

- **修正**：移除误加到 reactive `agent-pyai` 的 `agent-common-service` 依赖（会拖入 servlet `spring-boot-starter-web`/Tomcat，与 WebFlux 冲突）；pyai 的 `TraceIdWebFilter` 仅需 `agent-common-core` 的 `TraceIds`。
- **清理**：删除 `python-ai/.pytest_cache`；`.gitignore` 补全 Phase 4 工具产物 `.mypy_cache/`、`.ruff_cache/`、`htmlcov/`、`.coverage`、`*.egg-info/`（此前未覆盖）。
- **死代码登记**（在 Phase 5/6 删除）：py 侧 `crawl_site_resolver.py`、`crawl_goal.interpret_goal`、`crawl_ai_extractor` 的 discover/extract 目录函数、`DiscoverChaptersInput`、`set_catalog_cover(job_id)`；fe 侧 `LayoutOutletSuspense.tsx`、`LayoutOutletFallback.tsx`、`lenis` 死依赖。
- **i18n 决策**：正式接入（中文为默认 locale、命名空间懒加载），见 Phase 6 的 T6.0a。
