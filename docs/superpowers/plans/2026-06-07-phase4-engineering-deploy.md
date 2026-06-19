# Phase 4 实施计划：工程化 + CI/CD + 全链路部署 + 可观测性

> ⚠️ **历史设计记录**。生产已迁移至 **novel-studio 单体**，现状以 `CLAUDE.md` / `.cursor/rules/project-architecture.mdc` 为准。本文保留作历史参考，**勿据以部署**（旧微服务 agent-gateway/auth/pyai/content/consumer 与 `restart-dev.sh` 均已废弃）。

> 目标：①补齐三语言工程化（lint/typecheck/test 门禁）；②CI 质量 gate + branch protection；③CD 灰度/回滚/健康检查；④可观测性（结构化日志 + Prometheus 指标 + OTel 链路）。
>
> 周期：约 2 周 ｜ 可与 Phase 1~3 并行；**建议 CI 门禁（T4.1~T4.4）在 Phase 1 一开始就先落地**，让后续所有改动都受门禁保护。

---

## 任务总览

| # | 任务 | 侧 | 验证 |
|---|------|----|------|
| T4.1 | python-ai 引入 ruff + mypy + pytest-cov | py | 本地跑通 |
| T4.2 | frontend 补 eslint 配置 + 清理冗余 | fe | `pnpm lint` 通过 |
| T4.3 | Java 测试基建（Testcontainers + 核心覆盖） | java | `mvn test` |
| T4.4 | CI 三语言质量门禁 workflow | infra | PR 触发全绿 |
| T4.5 | CD 灰度/滚动发布 + 一键回滚 | infra | 演练 |
| T4.6 | 全服务健康检查（Actuator） | java | `/actuator/health` |
| T4.7 | 结构化日志 + trace_id 贯穿 | 全栈 | 日志含 trace_id |
| T4.8 | Prometheus 指标 + Grafana | 全栈 | `/metrics` 可抓取 |
| T4.9 | OpenTelemetry 链路追踪 | 全栈 | 链路可见 |
| T4.10 | 告警规则 | infra | 阈值告警 |

---

## T4.1 — python-ai 引入 ruff + mypy + pytest-cov

### 改动 `python-ai/pyproject.toml`

```toml
[project.optional-dependencies]
dev = ["pytest>=8.0.0", "pytest-asyncio>=0.23.0", "httpx>=0.27.0",
       "ruff>=0.5.0", "mypy>=1.10.0", "pytest-cov>=5.0.0"]

[tool.ruff]
line-length = 100
target-version = "py310"
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]

[tool.mypy]
python_version = "3.10"
ignore_missing_imports = true
warn_unused_ignores = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "--cov=app --cov-report=term-missing --cov-fail-under=70"
```

### 验证（即「单测」要求的工程化等价物）
```bash
cd python-ai && pip install -e ".[dev]"
cd python-ai && ruff check app/ tests/
cd python-ai && mypy app/ --ignore-missing-imports
cd python-ai && python -m pytest tests/ -q       # 覆盖率 ≥70% 才通过
```

> 首次引入 ruff 可能报大量历史问题：先 `ruff check --fix` 自动修，剩余加 `# noqa` 或分批治理，**不阻塞门禁上线**（先 warn 后 error）。

---

## T4.2 — frontend eslint 配置 + 清理冗余

### 改动
- 新建 `frontend/eslint.config.js`（flat config，含 `@typescript-eslint`、`eslint-plugin-react-hooks`）。`package.json` 的 `lint` 脚本已存在，补配置即可运行。
- 移除未使用的 `@tanstack/react-query`（`pnpm remove @tanstack/react-query`）——先 grep 确认零引用。
- 测试文件纳入类型检查：新建 `tsconfig.test.json` 或在 CI 单独 `tsc -p`。

### 验证
```bash
cd frontend && pnpm lint
cd frontend && pnpm tsc --noEmit
cd frontend && pnpm test
```

---

## T4.3 — Java 测试基建（P16，最大缺口）

### 改动
**1. 根 `pom.xml` / 各模块加测试依赖**：

```xml
<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
<dependency><groupId>org.testcontainers</groupId><artifactId>postgresql</artifactId><scope>test</scope></dependency>
<dependency><groupId>org.testcontainers</groupId><artifactId>junit-jupiter</artifactId><scope>test</scope></dependency>
<!-- reactor-test 用于 pyai -->
<dependency><groupId>io.projectreactor</groupId><artifactId>reactor-test</artifactId><scope>test</scope></dependency>
```

**2. 补核心覆盖（优先级）**：
- `agent-gateway`：`AuthGatewayFilter`、`RequestSignGatewayFilter`、`EncryptedRouteWebFilter`（安全关键，必测）。
- `agent-auth`：`RateLimitService`、`AuthService` 关键路径。
- `agent-content`：`StoryMemoryService`（冷热分层）、`CatalogService`、`ChapterService`、`AgentRunService`（Testcontainers PG + Redis）。
- `agent-pyai`：`AgentContextAssembler`、`AgentRunCoordinator`（Mockito）。

> 这些与 Phase 3 的 Java 任务单测**合并推进**，避免重复。

### 验证
```bash
cd novel-agent && mvn -B test          # 覆盖核心 Service/Filter
```

---

## T4.4 — CI 三语言质量门禁

### 新建 `.github/workflows/ci.yml`（与 `deploy-split.yml` 分离）

```yaml
name: CI
on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  frontend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: frontend } }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm, cache-dependency-path: frontend/pnpm-lock.yaml }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm tsc --noEmit
      - run: pnpm test
  python-ai:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: python-ai } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -e ".[dev]"
      - run: ruff check app/ tests/
      - run: mypy app/ --ignore-missing-imports
      - run: python -m pytest tests/ -q
  java:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: novel-agent } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 17, cache: maven }
      - run: mvn -B verify
```

### 配置 branch protection
- 在 GitHub 仓库设置中，要求 `frontend`/`python-ai`/`java` 三个 check 通过才可合并 PR。

### 验证
- 开一个测试 PR，确认三 job 触发并能挂红/挂绿。

---

## T4.5 — CD 灰度/滚动发布 + 一键回滚

### 改动 `legacy/novel-agent/agent-document/docs/deploy/scripts/`
**1. 镜像/制品按 git sha tag**：`deploy-fast.sh`/`ci-hot-deploy.sh` 给 jar/镜像打 `:{git_sha}` tag，保留最近 N 个。

**2. python-ai 滚动发布**：`python-ai` + `python-ai-2` 双实例，先停一个 → 健康检查 → 再发另一个（python-lb 期间仍可服务）。

**3. 新建 `rollback.sh`**：
```bash
# 用法: rollback.sh <service> <target> [git_sha]
# 默认回退到上一个备份 jar / 上一个镜像 tag，docker cp + restart + 健康检查
```

### 验证（演练）
- 故意部署一个坏版本 → `rollback.sh <svc> <target>` → 确认 < 1 分钟恢复，健康检查绿。

---

## T4.6 — 全服务健康检查（Actuator）

### 改动
- 各 Java 模块加 `spring-boot-starter-actuator`，暴露 `/actuator/health`（含 db/redis/rabbit 探针）。
- Compose `healthcheck` 用 `/actuator/health`；依赖服务用 `depends_on: condition: service_healthy`。

### 验证
```bash
curl http://<host>:8091/actuator/health   # content
curl http://<host>:8082/actuator/health   # pyai
# 期望 {"status":"UP", "components":{...}}
```

---

## T4.7 — 结构化日志 + trace_id 贯穿（P17）

### 改动
- **统一 trace_id**：前端 `secureFetch` 生成 `X-Trace-Id`（或网关生成），经 Gateway → pyai → content → python-ai 透传（header + MDC）。
- **Java**：Logback JSON encoder（`logstash-logback-encoder`），MDC 注入 trace_id/run_id/session_id。
- **python-ai**：`structlog` 或标准 logging JSON formatter，middleware 注入 trace_id。
- 集中采集：Loki 或 ELK（部署侧）。

### 验证
- 发一次请求，grep 各服务日志，确认同一 trace_id 串联全链路。

---

## T4.8 — Prometheus 指标 + Grafana

### 改动
- **python-ai**：`prometheus-fastapi-instrumentator` 暴露 `/metrics`；接 Phase 1 T1.8 的工具失败率计数器 + RAG 命中率 + turn 数。
- **Java**：Actuator + Micrometer Prometheus（`/actuator/prometheus`）。
- 部署 Prometheus 抓取 + Grafana dashboard。

### 关键指标（dashboard）
- `tool_calls_total{tool,status}` → 工具失败率
- `agent_turns` 分布、`autocompact_total`
- `rag_search_total`、`rag_hit_relevance`
- `crawl_job_status`、`mq_queue_depth`
- 各服务 P99 延迟、SSE/WS 连接数

### 验证
```bash
curl http://<host>:8000/metrics            # python-ai
curl http://<host>:8091/actuator/prometheus # content
```

---

## T4.9 — OpenTelemetry 链路追踪

### 改动
- Java：OTel Java agent（`-javaagent:opentelemetry-javaagent.jar`）自动埋点 Gateway/pyai/content。
- python-ai：`opentelemetry-instrumentation-fastapi` + `opentelemetry-instrumentation-httpx`。
- Collector + Jaeger/Tempo 后端。

### 验证
- 触发一次 Agent run，在 Jaeger 看到 Gateway → pyai → content → python-ai 完整 span 链。

---

## T4.10 — 告警规则

### 改动（Prometheus alerting rules）
- 工具失败率 > 5%（5 分钟）
- MQ 队列深度 > 阈值
- Embedding provider 不可用（防 hash 降级，关键）
- Milvus/Neo4j 连接失败
- 服务 `/actuator/health` DOWN
- SSE/WS 异常断连率突增

### 验证
- 人为触发条件（如停 embedding），确认告警触发。

---

## Phase 4 整体验收

```bash
# 三语言门禁本地全绿
cd frontend && pnpm lint && pnpm tsc --noEmit && pnpm test
cd python-ai && ruff check app/ tests/ && mypy app/ --ignore-missing-imports && python -m pytest tests/ -q
cd novel-agent && mvn -B verify
```

### Definition of Done
- [ ] CI 三语言 job 在 PR 强制门禁，branch protection 生效
- [ ] python-ai 覆盖率 ≥ 70%；Java 核心 Service/Filter 有测试
- [ ] 一键回滚演练通过（< 1 分钟）
- [ ] 全服务 `/actuator/health` 可用，Compose 依赖健康门
- [ ] trace_id 贯穿全链路日志
- [ ] Prometheus 指标可抓取，Grafana dashboard 展示工具失败率/RAG 命中率
- [ ] 关键告警规则生效
