# Novel Studio — 单体多模块后端

独立于 `novel-agent/` 微服务架构的全新 Java 后端。**不修改、不依赖** 原微服务代码路径；业务逻辑经 `scripts/port-sources.ps1` 从微服务迁移并重打包名。

## 设计目标

| 对比项 | novel-agent（微服务） | novel-studio（单体） |
|--------|----------------------|---------------------|
| 配置中心 | Nacos | 本地 `application.yml` |
| 进程 | 6 个 JVM + Gateway | **1 个 JVM，端口 8080** |
| 包名 | `com.novel.agent.*` | `cn.novelstudio.*` |
| 客户端安全 | AES / 路由混淆 / Sign | **默认全部关闭**（避免 400 REPLAY_*） |
| 模块间调用 | Feign / internal HTTP | **进程内直接注入 Biz**（无 loopback） |
| 部署 | MW + Worker 多机 | 单 jar，可后续拆模块 |

## 模块结构

```
novel-studio/
├── studio-dependencies/     # BOM（无 Spring Cloud / Nacos）
├── studio-kernel/           # Result / 异常 / 工具（纯 Java）
├── studio-platform/         # web / security / messaging / mail / media
├── studio-modules/
│   ├── studio-module-auth/
│   ├── studio-module-content/
│   ├── studio-module-agent/     # 原 PyAI（SSE + WebFlux）
│   ├── studio-module-billing/
│   └── studio-module-worker/    # 原 Consumer（MQ 监听）
├── studio-app/              # 唯一 @SpringBootApplication
├── docker/
└── scripts/
```

## API 路径（与前端兼容）

| 前缀 | 模块 |
|------|------|
| `/api/auth/**` | auth |
| `/api/content/**` | content |
| `/api/agent/**` | agent |
| `/api/billing/**` | billing |
| `/internal/**` | 供 **Python AI** 调用的 HTTP 边界（Java 模块间不走此路径） |

## 本地启动

**前置：** Java 17+、PostgreSQL、Redis、RabbitMQ（可用 `infra/docker compose`）

```powershell
# 1. 中间件（若尚未启动）
cd infra
docker compose up -d

# 2. 编译
$env:JAVA_HOME="D:\Programs\Java\jdk_21"
cd novel-studio
mvn -pl studio-app -am package -DskipTests

# 3. 运行
java -jar studio-app/target/studio-app-0.1.0-SNAPSHOT.jar
```

环境变量（可选）：

| 变量 | 默认 |
|------|------|
| `SERVER_PORT` | 8080 |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | localhost / 5432 / novel_agent |
| `REDIS_HOST` | localhost |
| `RABBITMQ_HOST` | localhost |
| `PYTHON_AI_BASE_URL` | http://127.0.0.1:8000 |
| `JWT_SECRET` | 开发默认值（生产务必修改） |

## 前端对接（开发模式）

在 `frontend/.env.local` 中启用单体模式：

```env
VITE_MONOLITH=true
VITE_LOCAL_MONOLITH=http://127.0.0.1:8080
```

等价于关闭 AES/路由混淆/Sign，全部 `/api` 代理到 `http://127.0.0.1:8080`（无需 `/g/...`）。

## 生产部署

见 [`deploy/README.md`](deploy/README.md)。

| 主机 | 角色 |
|------|------|
| MW | PostgreSQL、Redis、RabbitMQ、HTTPS 入口 nginx |
| Worker | `novel-studio:8080`、python-ai、frontend |

一键迁移 GitHub Action：**Migrate to novel-studio**（`deploy-migrate-stack.yml`，confirm=`MIGRATE`）。

## 模块间调用（单体规则）

Java 模块之间 **禁止** RestClient/Feign 互调，统一注入对方模块的 `@Component` Biz/Service：

| 调用方 | 被调用方 | 方式 |
|--------|----------|------|
| agent | content | `InternalAgentRunBiz`、`AuthStoryMemoryBiz` 等 |
| agent | billing | `QuotaBiz`、`UsageReportBiz` |
| worker | content | `AuthContentSessionBiz`、`InternalAgentRunBiz`、`CatalogService` |
| content | auth | `InternalUserStatsBiz` |
| auth / content | billing | `SiteSettingsBiz`、`FeatureGateBiz` 等 |

**唯一保留的 HTTP 出站**：`RestClient` → **Python AI**（`:8000`），配置项 `agent.python.base-url`。

`/internal/*` Controller 仍保留，供 Python 进程访问 Content；Java 代码不得再通过这些 URL 打自己。

修改 `novel-agent` 后，可重新 port（会覆盖 studio 内已 port 的 Java/SQL）：

```powershell
powershell -ExecutionPolicy Bypass -File novel-studio/scripts/port-sources.ps1
# 然后手工合并你在 studio 侧的架构改动（Feign 删除、Biz 直连等）
mvn compile -DskipTests
```

## 与原架构关系

- `novel-agent/`：**源码保留**，生产已切换至 `novel-studio` 单体栈
- `novel-studio/`：生产 Java 后端（MW 中间件 + Worker 应用分布式部署）
- 微服务 CI workflow 已移除；见 `novel-studio/deploy/README.md`

## 400 错误说明

线上 `POST /g/...` 返回 400 通常来自 Gateway 的 `ReplayGuardGatewayFilter`（`REPLAY_WINDOW` / `REPLAY_NONCE`），与客户端 AES/Sign 时钟或 nonce 有关。单体默认关闭整套 client-security，前端走明文 `/api/*`，开发链路更简单。
