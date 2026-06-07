# 生产部署指南

> AI 持久记忆：`.cursor/rules/deploy-ops.mdc`、`.cursor/rules/project-architecture.mdc`  
> 架构长文：`docs/ARCHITECTURE.md`

## 拓扑

| 角色 | 主机 | 典型职责 | 主要服务 |
|------|------|----------|----------|
| **MW** | `107.150.112.140` | 中间件、入口 Nginx、Gateway、Auth | PostgreSQL、Redis、RabbitMQ、Nacos |
| **Worker** | `47.80.80.224` | 业务 Java、Python AI、前端静态 | Content、PyAI、Consumer、python-ai、前端 Nginx |

域名：`https://www.novel-agent.cn`

## CI 质量门禁（PR / push）

- Workflow：`.github/workflows/ci.yml`（frontend lint/tsc/test、python-ai ruff/mypy/pytest、Java `mvn verify`）
- 建议在 GitHub branch protection 中勾选 `frontend` / `python-ai` / `java` 三个 check 为 required

## CI 自动部署（推荐）

- Workflow：`.github/workflows/deploy-split.yml`（push `master` 按路径变更热部署）
- Secrets：`DEPLOY_SSH_KEY`、`MW_HOST`、`WORKER_HOST`
- 脚本：`novel-agent/agent-document/docs/deploy/scripts/ci-hot-deploy.sh`
- 手动补发：`gh workflow run deploy-split.yml -f deploy_python_ai=true`（可多选服务）
- 服务列表：`gateway, auth, mw-auth, pyai, content, consumer, frontend, python-ai`

## 前置条件

1. 服务器已 clone 仓库至 `/opt/novel-agent`（或自定义 `MW_REMOTE_DIR` / `WORKER_REMOTE_DIR`）
2. 配置 split 环境：`novel-agent/agent-document/docs/deploy/docker/.env.split`（勿提交）
3. MW / Worker 各自 `.env.mw`、`.env.worker`（模板见 `.env.example`）

## 日常热更新（推荐）

```bash
# Java 模块（本地 mvn 编译 → scp jar → docker cp → restart）
bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh gateway mw
bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh auth mw
bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh pyai worker
bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh content worker

# 回滚上一版 jar（< 1 分钟，依赖 deploy-fast 备份）
bash novel-agent/agent-document/docs/deploy/scripts/rollback.sh pyai worker
bash novel-agent/agent-document/docs/deploy/scripts/rollback.sh content worker

# 前端（本地 vite build → 同步 dist → 注册 crypto）
bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh frontend worker
```

| 变量 | 说明 |
|------|------|
| `SKIP_BUILD=1` | 跳过 mvn，使用已有 `target/*.jar` |
| `SKIP_FRONTEND_BUILD=1` | 跳过 vite build，仅同步已有 dist |
| `VITE_CODE_OBFUSCATION=false` | 关闭 JS 混淆（调试） |

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

每次 `deploy-fast.sh frontend worker` 末尾会调用 `register-frontend-crypto.sh`：

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

1. **Auth 热更新 vs recreate**：`docker compose up --force-recreate agent-auth` 会用镜像内旧 jar 覆盖 `docker cp` 的热更新；recreate 后**必须**再跑 `deploy-fast.sh auth mw`。
2. **Mailtrap token** 仅服务器环境变量，代码读取 `${MAILTRAP_TOKEN}`。
3. **前端混淆**：默认开启；含动态 `import()` / entry chunk 自动跳过，避免 lazy route 404。
4. **401**：前端 `secureFetch` 尝试 refresh，失败清 session 跳转登录页。

## 相关脚本

| 脚本 | 用途 |
|------|------|
| `deploy-fast.sh` | 日常单服务热更新 |
| `deploy-route-v2.sh` | 路由脱敏 v2 分步部署 |
| `register-frontend-crypto.sh` | Worker crypto 注册 |
| `apply-enable-route-field-crypto.sh` | 首次开启 0e |
| `recover-mw-stack.sh` | MW 栈恢复探活 |

调试专用脚本（`_debug-*`）已移除；诊断可用 `docker logs` 或 `_gateway-log.sh`、`_verify-endpoints.sh`。
