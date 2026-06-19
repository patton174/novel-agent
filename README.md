# Novel Agent

AI 辅助小说创作平台：Vite + React 前端、Spring Boot 单体（novel-studio）、FastAPI Agent 编排。

> 现状权威记录：[`CLAUDE.md`](CLAUDE.md)、[`.cursor/rules/project-architecture.mdc`](.cursor/rules/project-architecture.mdc)、[`.cursor/rules/deploy-ops.mdc`](.cursor/rules/deploy-ops.mdc)。

## 架构（生产：novel-studio 单体，2026 起）

```
[ Frontend :3000 ]  →  [ novel-studio :8080 ]  →  [ python-ai :8000 ]
        ↓                        ↓
  Vite + React            单体 JVM（Auth/Content/Agent/Billing 模块）
        ↓                        ↓
  MW entry-nginx          PostgreSQL / Redis / RabbitMQ（MW）
```

| 目录 | 服务 | 端口 | 职责 |
|------|------|------|------|
| `frontend/` | Vite 前端 | 3000 | 编辑器、AI 助手面板、SSE 流 |
| `novel-studio/` | 单体 | 8080 | 鉴权、小说/章节/会话、Agent SSE、计费 |
| `python-ai/` | Python AI | 8000 | LLM、Agent 编排、RAG、工具；`CONTENT_BASE_URL` → novel-studio:8080 |
| `infra/` | Docker | 5432/6379/5672 | 本地可选 PostgreSQL、Redis、RabbitMQ |
| `legacy/novel-agent/` | （已废弃） | — | 旧 Spring Cloud 微服务，仅保留历史对照与 CI 部署脚本，勿部署 |

**生产拓扑**：浏览器 → https://www.novel-agent.cn → MW（entry-nginx + PG/Redis/RabbitMQ）→ Worker（novel-studio:8080 + python-ai:8000 + frontend）。

## 本地开发

> **`restart-dev.sh` / `start-dev*.bat` 已废弃（2026-06-05）。**
> 本地 Consumer 连生产 MQ 会抢线上 `agent.run.dispatch.queue`，导致 Agent 无响应。

| 场景 | 做法 |
|------|------|
| 前端 UI 小改 | `cd frontend && npm run dev`（**勿**启 Consumer / 勿连生产 MQ） |
| 全栈联调 | 部署到 Worker 后在线验收 |
| 中间件本地 | `cd infra && docker compose up -d`（PostgreSQL / Redis / RabbitMQ） |

**验收走线上**：https://www.novel-agent.cn

## 生产部署

分服务独立 CI，GitHub 编译 → scp 产物 → 服务器 Docker runtime：

| 服务 | Workflow |
|------|----------|
| novel-studio（单体 JVM） | `deploy-novel-studio.yml` |
| python-ai | `deploy-python-ai.yml` |
| frontend | `deploy-frontend.yml` |
| MW 基础设施 | `deploy-mw-nginx.yml`、`deploy-migrate-stack.yml` |

手动触发：`gh workflow run deploy-novel-studio.yml`；排查：`gh run list --workflow=deploy-novel-studio.yml` → `gh run watch <id>`。

完整说明见 [`novel-studio/deploy/README.md`](novel-studio/deploy/README.md)。

## 安全能力（Phase 0e）

| 能力 | 说明 |
|------|------|
| AES 传输层 | 请求/响应 body envelope（`RequestCryptoEnvelope`、Gateway `RequestDecrypt`） |
| 路由脱敏 | `/api/x/{token}`，`EncryptedRouteWebFilter` 还原真实路径 |
| 字段加密 | JSON key/value 密文（内层 `__sec`/`e[]` k/v） |
| 请求签名 | POST envelope 内 `sign`；GET/无 body POST 用 URL `_na_*` query |
| 前端混淆 | Terser + javascript-obfuscator（`VITE_CODE_OBFUSCATION`） |
| 邮箱验证 | 滑块验证码 + Mailtrap 发码（注册必填） |
| 401 处理 | 自动 refresh，失败跳转 `/login?reason=session_expired` |

设计文档：[`docs/superpowers/specs/2026-06-05-client-route-field-crypto-design.md`](docs/superpowers/specs/2026-06-05-client-route-field-crypto-design.md)
安全部署速查：[`.cursor/rules/security-deploy.mdc`](.cursor/rules/security-deploy.mdc)

## 密钥与环境

- **勿提交**：`.env*`、`.env.mw`、`.env.worker`、`env.bat`、`MAILTRAP_TOKEN`、含密钥的 rendered env。
- **勿本地启 Consumer 连生产 RabbitMQ**。
- **勿用** `restart-dev.sh` / `start-dev*.bat`。
- API Key / LLM 密钥仅环境变量，禁止硬编码。

## 协作规范

AI 与开发者协作文档：[`CLAUDE.md`](CLAUDE.md)；架构长文：[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。
