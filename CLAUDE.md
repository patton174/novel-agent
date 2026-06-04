# CLAUDE.md

本文件为 AI 与开发者提供项目协作规范；**本地开发栈重启只允许使用 `restart-dev.sh`**。

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

## 本地开发：重启服务（唯一方式）

> **禁止**使用 `start-dev.bat`、`start-dev-all.bat` 等 bat 启动脚本重启或拉起开发栈。  
> **只允许**使用 Git Bash 执行：

```bash
bash novel-agent/docs/deploy/windows/restart-dev.sh
```

脚本路径：`novel-agent/docs/deploy/windows/restart-dev.sh`

作用：先释放端口 `3000 / 8000 / 8082 / 8090 / 8091`，再按序启动 Python AI → PyAI → Content → Consumer → Frontend。  
日志目录：项目根 `.dev-logs/`（`python-ai.log`、`pyai.log`、`content.log`、`consumer.log`、`frontend.log`）。

环境变量由同目录 `env.bat` 注入（`PROJECT_ROOT`、`JAVA_HOME`、`VITE_REMOTE_AUTH` 等）。

## 何时必须重启（修改代码后）

| 改动范围 | 是否重启 | 说明 |
|----------|----------|------|
| `python-ai/` Agent、工具、提示词、路由 | **必须** | PyAI 调 Python；改工具/registry/planner 不重启不生效 |
| `novel-agent/` Java 业务、SSE、SideEffect | **必须** | 需重新 `spring-boot:run` |
| `frontend/` 仅 TSX/CSS、Vite 可 HMR 的改动 | 通常不必 | 浏览器硬刷新即可；改 `vite.config`、env 需重启 |
| `frontend/` 新增 npm 依赖 | **必须** | 跑 `restart-dev.sh` |
| 修改 `env.bat`、端口、远程 Auth 地址 | **必须** | |
| 仅改 Markdown/文档/测试（不跑服务） | 不必 | |

**经验法则**：跨 Python + Java + 前端的多文件重构、工具拆分、SSE 协议变更 → **一律 `restart-dev.sh` 全栈重启**，不要只刷新浏览器。

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

日常「改完代码继续实验」→ 只用 **`restart-dev.sh`**。

## Agent 编排（Python AI）

改编排、提示词、plan 规则时：**先读** `python-ai/AGENTS.md` 与 `python-ai/app/agent_step/orchestration_contract.py`，场景回归见 `python-ai/tests/fixtures/plan/scenarios.json`。

## Key Capabilities

- 章节续写/改写、大纲、角色对话、风格模仿、智能校对
- RAG 世界观一致性；Agent 工具：`output` / `write_chapter` / `chapter_*` / `memory_*`
- API Key 仅环境变量，禁止硬编码
