# 生产部署指南

> AI 持久记忆：`.cursor/rules/deploy-ops.mdc`、`.cursor/rules/project-architecture.mdc`  
> 架构长文：`docs/ARCHITECTURE.md`

## 拓扑

| 角色 | 主机 | 典型职责 | 主要服务 |
|------|------|----------|----------|
| **MW** | `107.150.112.140` | 中间件、Gateway、Auth、Consumer、Billing | PostgreSQL、Redis、RabbitMQ、Nacos |
| **Worker** | `47.80.80.224` | Content、PyAI、单 python-ai（LLM）、前端 | 爬虫分流至国内 `10.66.0.1` |
| **国内** | `118.89.123.201` | WireGuard + python-ai-cn（爬虫） | 不对公网建站 |

域名：`https://www.novel-agent.cn`

## CI 质量门禁（PR / push）

- Workflow：`.github/workflows/ci.yml`（frontend lint/tsc/test、python-ai ruff/mypy/pytest、Java `mvn verify`）
- 建议在 GitHub branch protection 中勾选 `frontend` / `python-ai` / `java` 三个 check 为 required

## CI 自动部署（推荐）

**GitHub 编译 → 传产物 → 服务器仅打 runtime Docker 镜像**（不在 MW/Worker 上跑 Maven，避免 OOM）。

| Workflow | 目标机 | 说明 |
|----------|--------|------|
| `deploy-gateway.yml` | MW | Java gateway |
| `deploy-auth.yml` | MW | Java auth |
| `deploy-consumer.yml` | MW | Java consumer |
| `deploy-billing.yml` | MW | Java billing |
| `deploy-content.yml` | Worker | Java content |
| `deploy-pyai.yml` | Worker | Java pyai |
| `deploy-frontend.yml` | Worker | Vite build + nginx 镜像 |
| `deploy-python-ai.yml` | Worker | 完整 python-ai 镜像（CI 构建后 docker save/load） |

- 各服务**独立 workflow**，一个失败不影响其他
- push `master` 按路径自动触发；也可 `gh workflow run deploy-gateway.yml` 手动部署
- Secrets 清单：`novel-agent/agent-document/docs/deploy/ci/SECRETS.example.md`
- CI 脚本目录：`novel-agent/agent-document/docs/deploy/ci/`

## 前置条件

1. 服务器已 clone 仓库至 `/opt/novel-agent`（或自定义 `MW_REMOTE_DIR` / `WORKER_REMOTE_DIR`）
2. 配置 split 环境：`novel-agent/agent-document/docs/deploy/docker/.env.split`（勿提交）
3. MW / Worker 各自 `.env.mw`、`.env.worker`（模板见 `.env.example`）

## 手动触发 CI 部署

```bash
gh workflow run deploy-gateway.yml
gh workflow run deploy-auth.yml
gh workflow run deploy-frontend.yml
gh run list --workflow=deploy-gateway.yml --limit 3
gh run watch <run-id>
```

本地调试（可选，需配置 `MW_HOST` / `DEPLOY_SSH_OPTS`）：

```bash
bash novel-agent/agent-document/docs/deploy/ci/build-java.sh agent-gateway
bash novel-agent/agent-document/docs/deploy/ci/deploy-java.sh gateway mw
```

## 回滚

```bash
# 使用 /opt/novel-agent/backups/<service>-<sha>.jar 或 *-prev.jar
bash novel-agent/agent-document/docs/deploy/scripts/rollback.sh gateway mw
bash novel-agent/agent-document/docs/deploy/scripts/rollback.sh billing mw
bash novel-agent/agent-document/docs/deploy/scripts/rollback.sh pyai worker
```

## 健康检查与指标（Phase 4）

| 服务 | Health | Prometheus |
|------|--------|------------|
| gateway | `http://<mw>:8080/actuator/health` | `/actuator/prometheus` |
| auth | `http://<mw>:8081/actuator/health` | `/actuator/prometheus` |
| pyai | `http://<worker>:8082/actuator/health` | `/actuator/prometheus` |
| content | `http://<worker>:8091/actuator/health` | `/actuator/prometheus` |
| python-ai | `http://<worker>:8000/metrics` | `/metrics` |

- 全链路 `X-Trace-Id`：前端 `secureFetch` 生成 → Gateway → Java → python-ai 日志字段 `trace_id`
- 告警规则模板：`novel-agent/agent-document/docs/deploy/observability/prometheus-alerts.yml`

## 数据库迁移（Flyway，Phase 8 T8.1）

三个 Java 服务共用 PostgreSQL 库 `novel_agent`，各自维护独立的 Flyway 历史表，避免版本号冲突：

| 服务 | 迁移目录 | Flyway 表 |
|------|----------|-----------|
| agent-auth | `agent-auth/src/main/resources/db/migration/` | `flyway_schema_history_auth` |
| agent-content | `agent-content/src/main/resources/db/migration/` | `flyway_schema_history_content` |
| agent-billing | `agent-billing/src/main/resources/db/migration/` | `flyway_schema_history`（默认） |

本地 profile 已切换 `spring.jpa.hibernate.ddl-auto=validate`；新表结构请新增 `V{n}__*.sql`，勿再依赖 Hibernate auto-ddl。

**已有库首次启用**（表已由旧版 `ddl-auto: update` 创建时）：直接启动各服务即可，`baseline-on-migrate: true` 会将 V1 标记为已 baseline。

**全新空库**：按 auth → content → billing 顺序启动，Flyway 依次建表。

**备份 / 恢复**（T8.2）：

```bash
bash novel-agent/agent-document/docs/deploy/scripts/backup-postgres.sh
bash novel-agent/agent-document/docs/deploy/scripts/restore-postgres.sh /opt/novel-agent/backups/pg/novel_agent-YYYY-MM-DD-HHMM.sql.gz
```

MW 建议 cron：`0 3 * * * /opt/novel-agent/novel-agent/agent-document/docs/deploy/scripts/backup-postgres.sh`

## 路由脱敏 v2 全量发布

分步或一键：

```bash
bash novel-agent/agent-document/docs/deploy/scripts/deploy-route-v2.sh all
# 或逐步：auth | gateway | frontend | register
```

首次开启 Phase 0e（Nacos flag + 前端 env）：

```bash
bash novel-agent/agent-document/docs/deploy/scripts/apply-enable-route-field-crypto.sh
```

Nginx `/g/{prefix}/` 路径需一次性配置，见 `patch-nginx-g-location.sh`。

## 请求签名规则

Gateway `RequestSignGatewayFilter` 与前端 `requestSign.ts` 对齐：

| 场景 | 签名位置 |
|------|----------|
| POST + AES envelope | body 内 `sign`、`ts`、`nonce`、`kid` |
| POST 无 body / 无 envelope | URL query：`_na_t`、`_na_n`、`_na_k`、`_na_s` |
| GET / PUT / DELETE | 同上 query 参数 |

Canonical：`METHOD|/api/path?businessQuery|ts|nonce|sha256(body)`

**不使用** `X-Novel-Agent-*` 请求头。

## 前端 crypto 轮换

`deploy-frontend.yml` 部署末尾会调用 `register-frontend-crypto.sh`：

- 向 Auth 注册 bootstrap 密钥与 `apiPathPrefix`（如 `g/55fa17a3`）
- 写入 Worker `crypto-runtime.json`（浏览器同源读取）
- 生成 manifest 发布至 Redis

Worker 每日 cron（可选）：`install-crypto-register-cron.sh`

## Auth：邮箱验证

| 配置 | 位置 |
|------|------|
| `MAILTRAP_TOKEN` | MW `.env.mw` / docker-compose 环境变量（**勿提交仓库**） |
| 验证码 TTL / 限流 | Nacos `auth.verification.*` |

公开 API（Gateway 白名单，无需登录）：

- `GET /api/auth/captcha/slider` — 滑块挑战
- `POST /api/auth/captcha/slider/verify` — 换取 captcha token
- `POST /api/auth/send-email-code` — 发送邮箱验证码

注册 `RegisterRequest.emailCode` 必填；老用户 `emailVerified=null` 仍可登录。

## Nacos 配置

- 模板（占位符）：`docker/nacos-split/*.yaml`
- 发布脚本：`python novel-agent/scripts/publish_nacos_config.py`
- **渲染目录** `nacos-split-rendered-0e/` 含真实密码，由 `apply-enable-route-field-crypto.sh` 生成，**不入库**

生产 Gateway 关键 flag（须与前端构建 env 对齐）：

```yaml
auth:
  client-security:
    route-obfuscation: true
    field-encryption: true
    aes-required: true
    encrypt-stream: true   # 与 VITE_SECURITY_ENCRYPT_STREAM=true 一致
```

前端 CI 构建 env：`VITE_SECURITY_AES`、`VITE_ROUTE_OBFUSCATION`、`VITE_FIELD_ENCRYPTION`、`VITE_SECURITY_ENCRYPT_STREAM=true`。

Gateway 对 `/api/agent/chat/stream` 同样走 AES 解密；SSE 请求体不做字段级 `__sec`（见 `frontend/src/security/secureFetch.ts`）。

## 注意事项

1. **勿在 MW 上 `docker compose build`**：内存不足会 OOM；改代码走 GitHub CI，服务器只接收产物打 runtime 镜像。
2. **force-recreate 后**：若镜像过旧，重新 `gh workflow run deploy-auth.yml` 部署当前 jar。
3. **Mailtrap token** 仅服务器环境变量，代码读取 `${MAILTRAP_TOKEN}`。
4. **前端混淆**：默认开启；含动态 `import()` / entry chunk 自动跳过，避免 lazy route 404。
5. **401**：前端 `secureFetch` 尝试 refresh，失败清 session 跳转登录页。

## 相关脚本

| 脚本 / 目录 | 用途 |
|-------------|------|
| `ci/build-java.sh`、`ci/deploy-java.sh` | CI 构建与部署 Java |
| `ci/build-frontend.sh`、`ci/deploy-frontend.sh` | 前端构建与部署 |
| `deploy-route-v2.sh` | 路由脱敏 v2（内部触发各 deploy-*.yml） |
| `register-frontend-crypto.sh` | Worker crypto 注册 |
| `apply-enable-route-field-crypto.sh` | 首次开启 0e |
| `recover-mw-stack.sh` | MW 栈恢复探活 |

调试专用脚本（`_debug-*`）已移除；诊断可用 `docker logs` 或 `_gateway-log.sh`、`_verify-endpoints.sh`。
