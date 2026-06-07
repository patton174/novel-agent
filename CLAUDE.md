# CLAUDE.md

本文件为 AI 与开发者提供项目协作规范；**本地 `restart-dev.sh` 已废弃**，验收走线上部署。

**AI 持久记忆（优先查阅）：**

- 架构与链路：`.cursor/rules/project-architecture.mdc`
- 部署与运维：`.cursor/rules/deploy-ops.mdc`
- 长文架构：`docs/ARCHITECTURE.md`
- 部署指南：`novel-agent/agent-document/docs/deploy/README.md`

## 项目架构

```
[ Frontend :3000 ]  →  [ PyAI :8082 ]  →  [ Python AI :8000 ]
        ↓                      ↓
  Vite + React           Spring Boot              FastAPI
        ↓                      ↓
  远程 Auth :8081        Content :8091
  远程 Gateway :8080     Consumer :8090
        ↓                      ↓
                    PostgreSQL / Redis / RabbitMQ（infra Docker 或远程）
                    Milvus / Chroma（向量，可选）
```

| 目录 | 服务 | 端口 | 职责 |
|------|------|------|------|
| `frontend/` | Vite 前端 | 3000 | 编辑器、AI 助手面板、SSE 流 |
| `python-ai/` | Python AI | 8000 | LLM、Agent 编排、RAG、工具策略 |
| `novel-agent/agent-pyai/` | PyAI | 8082 | Agent 运行协调、SSE 网关、章节副作用 |
| `novel-agent/agent-content/` | Content | 8091 | 小说/章节/会话 CRUD、记忆 API |
| `novel-agent/agent-consumer/` | Consumer | 8090 | 消息消费、权限同步 |
| 远程服务器 | Auth | 8081 | 登录鉴权（本地一般不启） |
| 远程服务器 | Gateway | 8080 | API 网关（本地一般不启） |
| `infra/` | Docker | 5432/6379/5672 | PostgreSQL、Redis、RabbitMQ |

**边界原则**

- Python AI：只做 LLM / Agent / RAG，不管用户系统与业务持久化
- Java：鉴权、限流、持久化、长任务队列、调用 Python AI
- 向量库：角色卡、世界观、章节摘要

## Claude Code 参考源码（只读）

对齐 StructuredOutput、tool 错误回灌、Agent loop 时，**优先查本地 CC 源码**（不要凭记忆）：

```
C:\Users\JZJ\.cursor\projects\d-Users-JZJ-Desktop-agent\claude-code-ref\src\
```

详见 `.cursor/rules/claude-code-ref.mdc`。

## 本地开发：重启服务

> **`restart-dev.sh` / `start-dev*.bat` 已废弃（2026-06-05）。**  
> 本地 Consumer 连生产 MQ 会抢线上 `agent.run.dispatch.queue`，导致 Agent 无响应。  
> 验收请用 https://www.novel-agent.cn ；部署用 CI / `deploy-fast.sh`。

若仅需改前端 UI，可单独 `cd frontend && npm run dev`，**不要**启动 Consumer 或连生产 RabbitMQ。

## 何时必须重启（修改代码后）

| 改动范围 | 是否重启 | 说明 |
|----------|----------|------|
| `python-ai/` Agent、工具、提示词、路由 | **部署 Worker** | CI 或 `deploy-fast.sh` |
| `novel-agent/` Java 业务、SSE、SideEffect | **部署对应服务** | 同上 |
| `frontend/` 仅 TSX/CSS | 通常 HMR | 单独 `npm run dev`；线上改走 CI frontend 部署 |
| `frontend/` 新增 npm 依赖 | **重启 frontend** | 本地 dev 或 CI |
| 仅改 Markdown/文档/测试 | 不必 | |

**经验法则**：跨 Python + Java + 前端的多文件重构、工具拆分、SSE 协议变更 → 走 CI 全量部署；**不要**本地起 Consumer 连生产 MQ。

## 基础设施（可选，与业务栈分开）

```powershell
cd infra
docker compose up -d          # PostgreSQL / Redis / RabbitMQ
.\scripts\start.ps1           # 同上
```

健康检查：`novel-agent/scripts/check_local_infra.py`

## 常用单服务命令（调试备用，非正常重启流程）

```bash
# Python AI（带 reload，仅调试单进程时用）
cd python-ai && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 前端（仅调试）
cd frontend && npm run dev -- --host
```

日常「改完代码继续实验」→ 走 CI / `deploy-fast.sh` 部署到 Worker，或仅本地 `npm run dev` 改前端。

## Agent 编排（Python AI）

改编排、提示词、plan 规则时：**先读** `python-ai/AGENTS.md` 与 `python-ai/app/agent_step/orchestration_contract.py`，场景回归见 `python-ai/tests/fixtures/plan/scenarios.json`。

## Key Capabilities

- 章节续写/改写、大纲、角色对话、风格模仿、智能校对
- RAG 世界观一致性；Agent 工具：`output` / `write_chapter` / `chapter_*` / `memory_*`
- API Key 仅环境变量，禁止硬编码

## 客户端安全（Phase 0e）

| 能力 | 关键路径 |
|------|----------|
| AES 传输层 | `RequestCryptoEnvelope`、Gateway `RequestDecrypt` |
| 路由脱敏 | `EncryptedRouteWebFilter`、`routePathCrypto.ts` |
| 字段加密 | 内层 `__sec`/`e[]` k/v |
| 请求签名 | `RequestSignCodec.java`、`requestSign.ts`、`RequestSignGatewayFilter` |
| 前端混淆 | `frontend/config/obfuscator.ts`，env `VITE_CODE_OBFUSCATION` |
| 401 跳转 | `secureFetch.ts`、`authSession.ts`、`authRefresh.ts` |
| 邮箱验证 | Auth `CaptchaController`、`EmailVerificationController`、Mailtrap |

**Sign 规则**：POST+envelope → body.sign；GET/无 body POST → URL `_na_t/_na_n/_na_k/_na_s`。不用 `X-Novel-Agent-*` 头。

**部署**：见 `novel-agent/agent-document/docs/deploy/README.md`；`.cursor/rules/security-deploy.mdc` 速查。

**注意**：

- `docker compose --force-recreate agent-auth` 后必须再 `deploy-fast.sh auth mw`
- `MAILTRAP_TOKEN`、`nacos-split-rendered-*` 含密钥，勿提交
- 本地勿用 `restart-dev.sh`（已废弃）；勿启 Consumer 连生产 MQ

