# Phase 8 实施计划：基础设施运营补齐

> **目标**：补齐生产运维闭环——可观测平台、DB 治理与备份、RAG 生产依赖、CI/预发/E2E 硬化、安全边界基线。  
> **周期**：约 4 周（可与 Phase 9 前期并行，Flyway 必须先于 billing 表迁移）  
> **设计规格**：`docs/superpowers/specs/2026-06-08-platform-operations-design.md` §3.1、§9

---

## 任务总览

| # | 任务 | 侧 | 验证 |
|---|------|----|------|
| T8.1 | Flyway 引入 + baseline migration | java | `ddl-auto=validate` 启动成功 |
| T8.2 | PostgreSQL 定时备份 + restore 演练脚本 | infra | 空库 restore 可启动 |
| T8.3 | Prometheus + Grafana + Alertmanager 部署 | infra | Dashboard 可见 JVM/FastAPI |
| T8.4 | Loki + Promtail 集中日志 | infra | trace_id 可检索 |
| T8.5 | Milvus 生产部署（MW 或独立机） | infra | python-ai RAG 连上 |
| T8.6 | CI 硬化（mypy 强制、Java IT、覆盖率） | infra | PR 全绿且不可 skip |
| T8.7 | Staging 环境与 promote 流程 | infra | staging 域名可访问 |
| T8.8 | Playwright E2E 基线（3 条核心路径） | fe | CI nightly 绿 |
| T8.9 | OpenTelemetry + Jaeger（可选 Week 4） | 全栈 | 单次请求可见 span |
| T8.10 | CSP + Sentry 接入 | fe/py/java | 错误可见、CSP 响应头存在 |

---

## T8.1 — Flyway 引入 + baseline

### 背景

当前 `application-local.yml` 使用 `ddl-auto: update`（`agent-auth`、`agent-content`）。生产 schema 无版本化，billing 等新表无法安全追加。

### 改动

**1. 根 `pom.xml` / 各 service 模块加依赖**：

```xml
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

**2. 新建 baseline（每个有 JPA 的模块或统一到 content DB）**：

```
novel-agent/agent-service/agent-auth/src/main/resources/db/migration/
  V1__baseline_auth.sql          # 从现有 PG dump auth 相关表
novel-agent/agent-service/agent-content/src/main/resources/db/migration/
  V1__baseline_content.sql
```

**3. 配置**：

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
```

**4. 本地 profile 过渡**：`application-local.yml` 可暂保留 `update` 直至 baseline 验证完成，然后切 `validate`。

### 验证

```bash
# 对已有库 baseline
cd novel-agent && mvn -B -pl agent-auth,agent-content flyway:baseline -Dflyway.baselineVersion=1

# 启动验证
mvn -pl agent-auth spring-boot:run -Dspring-boot.run.profiles=local
# 期望：Flyway 无 pending migration，JPA validate 通过
```

### DoD

- [ ] 现有表结构有 V1 baseline SQL（可重复在新库执行）
- [ ] 生产/预发 `ddl-auto=validate`
- [ ] 文档更新：`novel-agent/agent-document/docs/deploy/README.md` 增加 migration 说明

---

## T8.2 — PostgreSQL 备份与恢复

### 改动

**新建脚本**：

```
novel-agent/agent-document/docs/deploy/scripts/backup-postgres.sh
novel-agent/agent-document/docs/deploy/scripts/restore-postgres.sh
```

**backup-postgres.sh 要点**：

```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%F-%H%M)
BACKUP_DIR=${BACKUP_DIR:-/opt/novel-agent/backups/pg}
mkdir -p "$BACKUP_DIR"
docker exec novel-agent-postgres pg_dump -U postgres novel_agent | gzip > "$BACKUP_DIR/novel_agent-${STAMP}.sql.gz"
find "$BACKUP_DIR" -name '*.sql.gz' -mtime +30 -delete
```

**MW cron**（文档说明，不自动改生产 crontab）：

```
0 3 * * * /opt/novel-agent/novel-agent/agent-document/docs/deploy/scripts/backup-postgres.sh
```

### 验证

```bash
# 备份
bash novel-agent/agent-document/docs/deploy/scripts/backup-postgres.sh

# 恢复到测试库 novel_agent_restore
bash novel-agent/agent-document/docs/deploy/scripts/restore-postgres.sh novel_agent_restore <backup_file>
# agent-auth 指向 restore 库能启动
```

### DoD

- [ ] 备份脚本在 MW 实测成功
- [ ] restore 演练记录写入 deploy README
- [ ] Redis AOF / RabbitMQ 持久卷已在 compose 中 named volume（核对 `docker-compose.mw.yml`）

---

## T8.3 — Prometheus + Grafana + Alertmanager

### 背景

`prometheus-alerts.yml` 模板已存在，但未部署采集器。Java `/actuator/prometheus`、python `/metrics` 已暴露。

### 改动

**新建** `novel-agent/agent-document/docs/deploy/docker/docker-compose.observability.yml`：

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.54.0
    volumes:
      - ./observability/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./observability/prometheus-alerts.yml:/etc/prometheus/alerts/novel-agent.yml:ro
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana:11.2.0
    ports: ["3001:3000"]
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-changeme}

  alertmanager:
    image: prom/alertmanager:v0.27.0
    volumes:
      - ./observability/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
```

**新建** `observability/prometheus.yml` scrape configs：

```yaml
scrape_configs:
  - job_name: agent-gateway
    metrics_path: /actuator/prometheus
    static_configs: [{ targets: ['${MW_HOST}:8080'] }]
  - job_name: agent-auth
    static_configs: [{ targets: ['${MW_HOST}:8081'] }]
  - job_name: agent-pyai
    static_configs: [{ targets: ['${WORKER_HOST}:8082'] }]
  - job_name: agent-content
    static_configs: [{ targets: ['${WORKER_HOST}:8091'] }]
  - job_name: python-ai
    metrics_path: /metrics
    static_configs: [{ targets: ['${WORKER_HOST}:8000'] }]
```

Grafana：导入 JVM Micrometer、FastAPI 官方 dashboard。

### 验证

```bash
curl -s http://<mw>:9090/api/v1/targets | jq '.data.activeTargets[] | {job, health}'
# 全部 up

curl -s http://<worker>:8091/actuator/prometheus | head
curl -s http://<worker>:8000/metrics | head
```

### DoD

- [ ] 5 个 job 持续 up
- [ ] `ServiceHealthDown` 告警在 Alertmanager 可触发（故意停一个服务演练）
- [ ] deploy README 增加 observability 启动说明

---

## T8.4 — Loki + Promtail 集中日志

### 改动

在 `docker-compose.observability.yml` 追加：

```yaml
  loki:
    image: grafana/loki:3.1.0
    ports: ["3100:3100"]

  promtail:
    image: grafana/promtail:3.1.0
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./observability/promtail.yml:/etc/promtail/config.yml:ro
```

**Java**：`agent-common-service` 加 `logstash-logback-encoder`，pattern 含 `trace_id=%X{trace_id}`。

**python-ai**：`logging_setup.py` JSON formatter 含 `trace_id` 字段。

### 验证

```bash
# 发一次 Agent 请求，从响应头取 X-Trace-Id
# Grafana Explore → Loki：{job="python-ai"} |= "<trace_id>"
# 同 trace_id 在 gateway/pyai/content 日志均可搜到
```

### DoD

- [ ] 全链路同一 trace_id 在 Loki 可关联
- [ ] 日志不含 API Key / 密码明文

---

## T8.5 — Milvus 生产部署

### 背景

RAG 已 Milvus-only（Phase 1/2），但 Milvus 仅在本地 `infra/` optional profile，生产 compose 无向量库。

### 方案（二选一，文档中标注决策）

| 方案 | 适用 |
|------|------|
| **A. MW 加 Milvus standalone** | MW 内存够（建议 ≥8G 或独立向量小机） |
| **B. Zilliz Cloud / 第三台向量机** | MW 2C4G 紧张（当前拓扑） |

**方案 A 改动** `docker-compose.mw.yml`：

```yaml
  milvus:
    image: milvusdb/milvus:v2.4.15
    command: ["milvus", "run", "standalone"]
    ports: ["19530:19530"]
    volumes: [milvus_data:/var/lib/milvus]
```

**python-ai `.env`（Worker）**：

```
MILVUS_HOST=<MW内网IP或milvus>
MILVUS_PORT=19530
```

### 验证

```bash
cd python-ai && python -m pytest tests/test_chapter_index_milvus.py -q
# 生产：爬取一章 → SearchKnowledge 可检索
```

### DoD

- [ ] Milvus 重启后 collection 数据仍在
- [ ] python-ai 两实例均指向同一 Milvus
- [ ] 监控：Milvus 连接失败告警（扩展现有 prometheus-alerts.yml）

---

## T8.6 — CI 硬化

### 改动 `.github/workflows/ci.yml`

1. 移除 python job 中 `mypy` 的 `continue-on-error: true`
2. Java job：`mvn -B verify`（去掉 `-DskipITs`）或拆 `verify` + `integration-test` job
3. 新增 Testcontainers 集成测试（至少 `agent-content` 1 个 IT）
4. GitHub branch protection：勾选 `frontend` / `python-ai` / `java` required
5. python coverage：CI 与 `pyproject.toml` 对齐，逐步 50% → 70%

### 验证

```bash
# 本地
cd novel-agent && mvn -B verify
cd python-ai && mypy app/ --ignore-missing-imports
cd frontend && pnpm lint && pnpm test
```

### DoD

- [ ] 故意引入 type error，PR CI 失败
- [ ] branch protection 已启用（截图或文档记录）

---

## T8.7 — Staging 环境

### 改动

1. 新建 `docker-compose.staging.yml` 或 `.env.staging`（独立 DB `novel_agent_staging`）
2. 域名 `staging.novel-agent.cn`（Nginx server block 模板）
3. 新建 workflow `.github/workflows/deploy-staging.yml`：
   - trigger：`push` to `staging` branch
   - 部署目标：staging Worker（可与 prod Worker 同机不同 compose project，或第三台小机）
4. `deploy-split.yml` prod 部署改为 **manual approve** 或仅 `master` + 需 staging 绿

### 验证

```bash
git push origin staging
# staging 站点可登录、Agent 可跑
# prod 未变更
```

### DoD

- [ ] staging 与 prod DB/Redis/MQ 隔离
- [ ] promote 流程文档化（merge master → auto prod 或 manual workflow_dispatch）

---

## T8.8 — Playwright E2E 基线

### 改动

```bash
cd frontend && pnpm add -D @playwright/test
```

**新建** `frontend/e2e/`：

| 文件 | 场景 |
|------|------|
| `auth.spec.ts` | 注册/登录（staging 测试账号） |
| `dashboard.spec.ts` | 登录后进 `/dashboard`，summary 卡片可见 |
| `editor-stream.spec.ts` | 打开 editor，发一条消息，timeline 出现 assistant 块（timeout 60s） |

**CI**：`.github/workflows/e2e-nightly.yml` 对 staging  nightly 跑。

### 验证

```bash
cd frontend && pnpm exec playwright test
```

### DoD

- [ ] 3 spec 在 staging 绿
- [ ] 失败时保留 trace/screenshot artifact

---

## T8.9 — OpenTelemetry（Week 4 可选）

### 改动

- Java：`micrometer-tracing-bridge-otel` + `opentelemetry-exporter-otlp`
- python：`opentelemetry-instrumentation-fastapi`
- 部署 Jaeger 或 Grafana Tempo（并入 observability compose）

### 验证

Jaeger UI 可见：`gateway → pyai → python-ai` 单次 POST span。

---

## T8.10 — CSP + Sentry

### CSP

修改 `nginx-entry-mw-ssl.conf.template`：

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; connect-src 'self' https://www.novel-agent.cn wss://...; ..." always;
```

### Sentry

- frontend：`@sentry/react` 在 `main.tsx` 初始化（`VITE_SENTRY_DSN`）
- python：`sentry-sdk[fastapi]`
- Java：`sentry-spring-boot-starter-jakarta`

### 验证

- 故意 `throw new Error('sentry-test')` → Sentry 收到 event
- `curl -I https://www.novel-agent.cn` 含 CSP 头

---

## Phase 8 完成定义

- [ ] T8.1–T8.8 全部勾选
- [ ] T8.9/T8.10 至少一项完成（或明确延期记录）
- [ ] `implementation-index.md` Phase 8 勾选
- [ ] 生产演练：backup restore + rollback.sh + Grafana 告警各一次

---

## 依赖关系

```
T8.1 Flyway ──► Phase 9 所有 DB migration
T8.3 Prometheus ──► Phase 10 成本看板（可选接 Grafana）
T8.5 Milvus ──► RAG 生产稳定（与 Phase 9 无硬依赖）
T8.7 Staging ──► Phase 9/10 联调环境
```
