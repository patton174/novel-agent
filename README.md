# Novel Agent

AI 辅助小说创作平台：Vite + React 前端、Spring Boot 微服务、FastAPI Agent 编排。

## 架构

```
[ Frontend :3000 ]  →  [ PyAI :8082 ]  →  [ Python AI :8000 ]
        ↓                      ↓
  远程 Gateway :8080     Content :8091 / Consumer :8090
        ↓
  远程 Auth :8081
        ↓
  PostgreSQL / Redis / RabbitMQ / Nacos
```

| 目录 | 说明 |
|------|------|
| `frontend/` | Vite + React 编辑器与 AI 助手 |
| `python-ai/` | FastAPI：LLM、Agent 工具、RAG |
| `novel-agent/` | Java 微服务（Auth、Gateway、Content、PyAI、Consumer） |
| `infra/` | 本地 Docker：PostgreSQL、Redis、RabbitMQ |

## 本地开发

**重启开发栈（唯一方式）**——在 Git Bash 中执行：

```bash
bash novel-agent/agent-document/docs/deploy/windows/restart-dev.sh
```

禁止使用 `start-dev.bat` / `start-dev-all.bat` 重启。

- 环境变量模板：`novel-agent/agent-document/docs/deploy/windows/env.bat.example`
- 基础设施：`infra/README.md`
- 详细说明：`novel-agent/agent-document/docs/deploy/LOCAL-DEV.md`、`CLAUDE.md`

## 生产部署

双机拓扑（MW 中间件 + Gateway/Auth，Worker 业务与前端）：

```bash
bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh gateway mw
bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh auth mw
bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh frontend worker
```

完整说明见 [`novel-agent/agent-document/docs/deploy/README.md`](novel-agent/agent-document/docs/deploy/README.md)。

## 安全能力（Phase 0e）

| 能力 | 说明 |
|------|------|
| AES 传输层 | 请求/响应 body envelope |
| 路由脱敏 | `/api/x/{token}`，Gateway 还原真实路径 |
| 字段加密 | JSON key/value 密文 |
| 请求签名 | POST envelope 内 `sign`；GET/无 body POST 用 URL `_na_*` query |
| 前端混淆 | Terser + javascript-obfuscator（`VITE_CODE_OBFUSCATION`） |
| 邮箱验证 | 滑块验证码 + Mailtrap 发码（注册必填） |
| 401 处理 | 自动 refresh，失败跳转 `/login?reason=session_expired` |

设计文档：[`docs/superpowers/specs/2026-06-05-client-route-field-crypto-design.md`](docs/superpowers/specs/2026-06-05-client-route-field-crypto-design.md)

## 密钥与环境

- **勿提交**：`.env*`、`.env.mw`、`.env.worker`、`env.bat`、`MAILTRAP_TOKEN`
- Nacos 渲染目录（含真实密码）由部署脚本生成，已在 `.gitignore`

## 协作规范

AI 与开发者协作文档：[`CLAUDE.md`](CLAUDE.md)
