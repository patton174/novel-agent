# Novel Studio 生产部署

从 `novel-agent` 微服务栈迁移到 **novel-studio 单体 + 分布式基础设施**（MW 中间件 + Worker 应用）。

## 拓扑

```
浏览器 → MW entry-nginx:443
           └→ Worker frontend:3000
                 ├ /api/* → novel-studio:8080（单体 JVM）
                 ├ /g/*   → novel-studio:8080（路由脱敏，与 /api 同链路）
                 └ 静态资源

novel-studio (Worker) ──→ PostgreSQL / Redis / RabbitMQ (MW)
         └─ HTTP ──→ python-lb:8000 → python-ai
python-ai ──→ novel-studio:8080 /api/content/auth/*（X-Internal-Service-Key + X-User-Id，不经浏览器 Sign/AES）
```

| 主机 | 服务 |
|------|------|
| **MW** `107.150.112.140` | entry-nginx、PostgreSQL、Redis、RabbitMQ、**Milvus**（RAG） |
| **Worker** `47.80.80.224` | novel-studio、python-ai、python-lb、frontend |

**已移除**：Nacos、Gateway、Auth/Consumer/Billing/Content/PyAI 六个 Java 微服务。  
**注意**：MW 入口不得将 `/g/` 直连 novel-studio（WireGuard 旁路）；须与 `/api/` 一并经 Worker frontend 反代，否则路由脱敏无法还原、登录 401。

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
ln -sfn /opt/novel-agent/legacy/novel-agent/agent-document/docs/deploy/docker/letsencrypt \
  /opt/novel-agent/novel-studio/deploy/docker/letsencrypt
```

### 2. GitHub Actions 执行顺序

1. **Reset production stack**（`deploy-reset-stack.yml`）  
   - `workflow_dispatch`，confirm 填 `RESET`  
   - 停旧容器、DROP/CREATE `novel_agent` 库、启动新 compose 骨架

2. **Deploy novel-studio** → 上传单体 JAR  
3. **Deploy python-ai** → `CONTENT_BASE_URL=http://novel-studio:8080`（经单体服务间鉴权，勿再连遗留 agent-content）  
4. **Deploy frontend** → 生产开启 AES/路由混淆/代码混淆；末尾 `register-frontend-crypto.sh` 注册 bootstrap

或 push 到 `main` 后各 workflow 按 path 自动触发。

### 3. 本地一键脚本（有 SSH 密钥时）

```bash
export MW_HOST=107.150.112.140 WORKER_HOST=47.80.80.224
export DEPLOY_SSH_KEY_FILE=~/.ssh/deploy_key

bash novel-studio/deploy/ci/reset-production.sh --yes-destroy-all
bash novel-studio/deploy/ci/build-studio.sh
bash novel-studio/deploy/ci/deploy-studio.sh
bash legacy/novel-agent/agent-document/docs/deploy/ci/build-python-ai.sh
bash novel-studio/deploy/ci/deploy-python-ai.sh
bash novel-studio/deploy/ci/build-frontend.sh
bash novel-studio/deploy/ci/deploy-frontend.sh
```

## CI Workflows

| Workflow | 触发 | 说明 |
|----------|------|------|
| `deploy-novel-studio.yml` | `novel-studio/**` push | 仅编译 JAR + Worker 上 `compose up novel-studio`（**不含** MW nginx） |
| `deploy-frontend.yml` | `frontend/**` push | 构建 dist + Worker frontend |
| `deploy-python-ai.yml` | `python-ai/**` push | 镜像导出 + Worker python-ai |
| `deploy-mw-nginx.yml` | nginx 模板 / 手动 | MW entry-nginx + TLS（改路由/证书时用） |
| `deploy-reset-stack.yml` | 手动 | 破坏性重建 |
| `ci.yml` | PR | 编译 novel-studio |

**职责拆分**：应用部署与 MW 入口 nginx 分离，避免每次推 Java 代码都重建 MW nginx（此前易导致 CI 红但 Worker 已更新）。

**已删除**：`deploy-gateway.yml`、`deploy-content.yml` 及旧微服务 workflow

## 前端开发

`frontend/.env.local`（本地 CN / 单体）：

```env
VITE_MONOLITH=true
VITE_LOCAL_MONOLITH=http://127.0.0.1:8080
VITE_SECURITY_BYPASS=true
VITE_SECURITY_AES=false
VITE_ROUTE_OBFUSCATION=false
```

本地 CN 全栈：`powershell -ExecutionPolicy Bypass -File scripts\_restart-dev-stack.ps1`（见 `.cursor/rules/dev-restart.mdc`）。

**生产构建**（CI `build-frontend.sh`）：`VITE_SECURITY_AES=true`、`VITE_ROUTE_OBFUSCATION=true`、`VITE_CODE_OBFUSCATION=true`。  
Crypto bootstrap：浏览器 **`GET /api/auth/crypto-config`**（Redis，无静态 `crypto-runtime.json`）。  
产物 JS/CSS 均为 `assets/[hash].*`，`src/security/**` 强混淆。

## 排查

| 问题 | 处理 |
|------|------|
| `deploy-*` CI 失败 | `gh run view <id> --log-failed`；MW nginx 见 `deploy-mw-nginx.yml` |
| 登录 `/g/` 401 | MW `entry-nginx` 须 proxy 到 Worker frontend:3000，与 `/api/` 一致 |
| crypto 失效 | Worker：`bash novel-studio/deploy/ci/register-frontend-crypto.sh` |
| 本地端口占用 | `netstat -ano` + `taskkill`；或 `_restart-dev-stack.ps1` 先停端口 |

```bash
python scripts/test_login_crypto.py --base https://novel-agent.cn --mode compare
```

## python-ai

Worker compose 注入：

- `CONTENT_BASE_URL=http://novel-studio:8080`（与单体同 Docker 网络 `novel-net`；请求头带 `INTERNAL_SERVICE_KEY` + `X-User-Id`）
- `BILLING_REPORT_URL=http://novel-studio:8080`（LLM 用量上报 `/internal/billing/usage/report`）
- `INTERNAL_SERVICE_KEY` 与 `AGENT_INTERNAL_SERVICE_KEY` 一致

**勿再**部署或保留 `agent-content:8091` 容器；若 Worker 上仍有 `novel-agent-worker-agent-content-1`，应停止并改 python-ai 环境变量后重启。

## Milvus（RAG 向量库）

Milvus 部署在 **MW**，Worker 上的 `python-ai` 通过 `MILVUS_HOST` 远程连接。

### 一键部署（需 SSH 密钥）

```bash
export MW_HOST=107.150.112.140 WORKER_HOST=47.80.80.224
export DEPLOY_SSH_KEY_FILE=~/.ssh/deploy_key
bash novel-studio/deploy/ci/deploy-milvus.sh
```

或 GitHub Actions：**Deploy Milvus (MW)** workflow（`deploy-milvus.yml`）。

脚本会：

1. 在 MW 启动 `docker-compose.milvus.yml`（`milvusdb/milvus:v2.4.15` standalone）
2. 设置 `vm.max_map_count=262144`
3. 若 ufw 已启用，仅放行 Worker IP 访问 `19530`
4. 写入 Worker `/opt/novel-agent/python-ai/.env`：`MILVUS_HOST`、`MILVUS_PORT`、`KG_ENABLED=true`
5. 重启 `python-ai` 容器

### python-ai 环境变量

```env
MILVUS_HOST=107.150.112.140
MILVUS_PORT=19530
# 向量 embedding（与聊天 LLM 独立）
RAG_EMBED_API_KEY=<OpenAI 或兼容 embedding API key>
RAG_EMBED_MODEL=text-embedding-3-small
KG_ENABLED=true
```

### 验证

```bash
# Worker 容器内
docker exec novel-studio-worker-python-ai-1 python scripts/check_milvus.py

# 线上：编辑器左侧大纲 →「重建向量索引」，Agent 调用 SearchKnowledge 应能命中章节
```

### 本地开发连远程 Milvus

`scripts/local-remote.env` 增加：

```env
MILVUS_HOST=107.150.112.140
MILVUS_PORT=19530
```

`start-local-dev.ps1 -Remote` 会自动注入到本机 python-ai 进程。

## MW 遗留容器清理（Nacos / Gateway）

**2026-06 审计**：MW `107.150.112.140` 仅 **3.6GB 内存**，仍运行已废弃组件：

| 容器 | 内存 | 状态 | 可否删除 |
|------|------|------|----------|
| `nacos-standalone`（1Panel） | **~1.5GB** | 微服务时代注册中心 | **是**，Worker 无 `NACOS_*` |
| `novel-agent-mw-agent-gateway-1` | ~285MB | 旧 Gateway :8080 | **是**，流量走 entry-nginx → Worker |
| `novel-studio-mw-entry-nginx-1` | ~4MB | HTTPS 入口 | **保留** |
| 1Panel PG / Redis / RabbitMQ | ~250MB | 数据面 | **保留**（见迁移） |
| `novel-studio-milvus*` | ~310MB | RAG | **可迁出 MW** |

当前 nginx 已指向 `47.80.80.224:3000`，**不经过 Gateway/Nacos**。

```bash
export MW_HOST=107.150.112.140 DEPLOY_SSH_KEY_FILE=~/.ssh/deploy_key
bash novel-studio/deploy/ci/purge-legacy-mw.sh
# 然后在 1Panel → 应用 → Nacos → 停止并卸载（防止重启后再拉起）
```

清理后预计释放 **~1.8GB**，可显著缓解 PG/Redis 连接不稳定。

## 脱离 1Panel：中间件 Docker 化（保留数据卷）

**目标**：卸载 1Panel，PG / Redis / RabbitMQ 改用 `docker-compose.infra.yml`，数据从 1Panel 卷复制到 `infra-data/`。

| 原 1Panel 路径 | 新路径 |
|----------------|--------|
| `/opt/1panel/apps/postgresql/postgresql/data` | `deploy/docker/infra-data/postgresql/` |
| `/opt/1panel/apps/redis/redis/data` + `conf/` | `deploy/docker/infra-data/redis/` |
| `/opt/1panel/apps/rabbitmq/rabbitmq/data` | `deploy/docker/infra-data/rabbitmq/data/` |

**注意**：`1pctl uninstall` 会删除 `/opt/1panel`，必须先完成 `rsync` 到 `infra-data/`。

```bash
export MW_HOST=107.150.112.140 WORKER_HOST=47.80.80.224
export DEPLOY_SSH_KEY_FILE=~/.ssh/deploy_key

# 建议先迁移但不卸载，验收后再卸 1Panel：
bash novel-studio/deploy/ci/migrate-mw-infra-from-1panel.sh --yes-migrate --skip-uninstall

# Worker 重启应用
ssh root@$WORKER_HOST 'cd /opt/novel-agent/novel-studio/deploy/docker && \
  docker compose -f docker-compose.worker.yml --env-file .env.worker up -d --force-recreate novel-studio python-ai'

# 线上 OK 后卸载 1Panel：
ssh root@$MW_HOST 'UNINSTALL_1PANEL=true WORKER_HOST=47.80.80.224 bash /opt/novel-agent/novel-studio/deploy/ci/migrate-mw-infra-remote.sh'
# 或一步完成（含卸载）：
bash novel-studio/deploy/ci/migrate-mw-infra-from-1panel.sh --yes-migrate
```

迁移后 MW 容器应为：`entry-nginx`、`novel-studio-postgresql`、`novel-studio-redis`、`novel-studio-rabbitmq`、`novel-studio-milvus*`（无 1Panel / Nacos / Gateway）。

本地 dev 凭据：`scripts/pull-local-remote-env.ps1` 会优先读 MW 上 `.env.infra`。

## 中间件拆分建议（不要把所有东西堆在 MW）

| 阶段 | 做法 | 收益 |
|------|------|------|
| **P0 立即** | 删 Nacos + 旧 Gateway（上节） | MW 内存从 3.1GB→~1.3GB 用量 |
| **P1 短期** | **Milvus 迁到 Worker** 或单独 2GB 小机 | MW 再释 ~400MB；RAG 与 python-ai 同网延迟更低 |
| **P2 中期** | PG 迁到独立实例（或云 RDS） | MW 只留 entry-nginx + Redis + MQ；DB 连接更稳 |
| **P3 长期** | Redis/MQ 按需独立或托管 | 本地 dev 连公网中间件更可靠 |

**推荐目标拓扑**（MW 只做入口 + 轻量 MQ/Redis，或仅 nginx）：

```
MW (2–4GB)     entry-nginx + Redis + RabbitMQ（或仅 nginx）
Data (4GB+)    PostgreSQL
Worker (2GB+)  novel-studio + python-ai + frontend + Milvus（可选）
```

Milvus 迁 Worker：在 Worker 部署 `docker-compose.milvus.yml`，改 `python-ai` 的 `MILVUS_HOST=127.0.0.1`，MW 上 `docker compose -f docker-compose.milvus.yml down`。

## 验收

- https://www.novel-agent.cn 登录注册
- 编辑器 Agent SSE `/api/agent/chat/stream`
- `GET /actuator/health` on Worker `:8080`
