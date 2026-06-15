# Novel Studio 生产部署

从 `novel-agent` 微服务栈迁移到 **novel-studio 单体 + 分布式基础设施**（MW 中间件 + Worker 应用）。

## 拓扑

```
浏览器 → MW entry-nginx:443
           └→ Worker frontend:3000
                 ├ /api/* → novel-studio:8080（单体 JVM）
                 └ 静态资源

novel-studio (Worker) ──→ PostgreSQL / Redis / RabbitMQ (MW)
         └─ HTTP ──→ python-lb:8000 → python-ai
python-ai ──→ novel-studio:8080 /api/content/auth/*（X-Internal-Service-Key + X-User-Id，不经浏览器 Sign/AES）
```

| 主机 | 服务 |
|------|------|
| **MW** `107.150.112.140` | entry-nginx、PostgreSQL、Redis、RabbitMQ |
| **Worker** `47.80.80.224` | novel-studio、python-ai、python-lb、frontend |

**已移除**：Nacos、Gateway、Auth/Consumer/Billing/Content/PyAI 六个 Java 微服务、路由混淆 `/g/`、`crypto-runtime.json`。

## 首次迁移（删库重建）

### 1. 服务器准备 env

SSH 到 Worker，创建新 env（可从旧 `.env.worker` 复制 DB/Redis/MQ/JWT/INTERNAL_KEY）：

```bash
cd /opt/novel-agent/novel-studio/deploy/docker
cp .env.worker.example .env.worker
# 编辑 DB_* / REDIS_* / RABBITMQ_* / JWT_SECRET / AGENT_INTERNAL_SERVICE_KEY
```

MW 同理：

```bash
cd /opt/novel-agent/novel-studio/deploy/docker
cp .env.mw.example .env.mw
# DOMAIN / WORKER_HOST / 证书路径
# 保留 letsencrypt/ 目录（从旧 docker 目录复制或软链）
```

若 `letsencrypt` 仍在旧路径：

```bash
ln -sfn /opt/novel-agent/novel-agent/agent-document/docs/deploy/docker/letsencrypt \
  /opt/novel-agent/novel-studio/deploy/docker/letsencrypt
```

### 2. GitHub Actions 执行顺序

1. **Reset production stack**（`deploy-reset-stack.yml`）  
   - `workflow_dispatch`，confirm 填 `RESET`  
   - 停旧容器、DROP/CREATE `novel_agent` 库、启动新 compose 骨架

2. **Deploy novel-studio** → 上传单体 JAR  
3. **Deploy python-ai** → `CONTENT_BASE_URL=http://novel-studio:8080`（经单体服务间鉴权，勿再连遗留 agent-content）  
4. **Deploy frontend** → 关闭 AES/路由混淆构建

或 push 到 `main` 后各 workflow 按 path 自动触发。

### 3. 本地一键脚本（有 SSH 密钥时）

```bash
export MW_HOST=107.150.112.140 WORKER_HOST=47.80.80.224
export DEPLOY_SSH_KEY_FILE=~/.ssh/deploy_key

bash novel-studio/deploy/ci/reset-production.sh --yes-destroy-all
bash novel-studio/deploy/ci/build-studio.sh
bash novel-studio/deploy/ci/deploy-studio.sh
bash novel-agent/agent-document/docs/deploy/ci/build-python-ai.sh
bash novel-studio/deploy/ci/deploy-python-ai.sh
bash novel-studio/deploy/ci/build-frontend.sh
bash novel-studio/deploy/ci/deploy-frontend.sh
```

## CI Workflows

| Workflow | 说明 |
|----------|------|
| `deploy-novel-studio.yml` | Maven 编译 + Worker 部署 |
| `deploy-python-ai.yml` | Python AI 镜像 |
| `deploy-frontend.yml` | 前端（VITE_MONOLITH=true） |
| `deploy-reset-stack.yml` | 破坏性重建（手动） |
| `ci.yml` | PR 编译 novel-studio |

**已删除**：`deploy-gateway/auth/consumer/billing/content/pyai.yml`

## 前端开发

`frontend/.env.local`：

```env
VITE_MONOLITH=true
VITE_LOCAL_MONOLITH=http://127.0.0.1:8080
```

本地只跑 `novel-studio` + `npm run dev`，所有 `/api` 走 8080。

## python-ai

Worker compose 注入：

- `CONTENT_BASE_URL=http://novel-studio:8080`（与单体同 Docker 网络 `novel-net`；请求头带 `INTERNAL_SERVICE_KEY` + `X-User-Id`）
- `BILLING_REPORT_URL=http://novel-studio:8080`（LLM 用量上报 `/internal/billing/usage/report`）
- `INTERNAL_SERVICE_KEY` 与 `AGENT_INTERNAL_SERVICE_KEY` 一致

**勿再**部署或保留 `agent-content:8091` 容器；若 Worker 上仍有 `novel-agent-worker-agent-content-1`，应停止并改 python-ai 环境变量后重启。

## 验收

- https://www.novel-agent.cn 登录注册
- 编辑器 Agent SSE `/api/agent/chat/stream`
- `GET /actuator/health` on Worker `:8080`
