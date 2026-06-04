# 本地开发启动（Nacos + 本机 PG/Redis/RabbitMQ）

## 1. 基础设施

### Windows 推荐：Docker 一键部署

无需在本机单独安装 PostgreSQL / Redis / RabbitMQ，见仓库 **`infra/`** 目录：

```powershell
cd infra
Copy-Item .env.example .env
.\scripts\start.ps1
```

详细说明：[infra/README.md](../../../infra/README.md)

| 组件 | 地址 | 说明 |
|------|------|------|
| Nacos | `10.8.0.107:8848` | 命名空间 `dev`，分组 `NOVEL_AGENT_GROUP` |
| PostgreSQL | `localhost:5432` | 库名 `novel_agent`，用户默认 `postgres` |
| Redis | `localhost:6379` | 密码见 `infra/.env` / `application-local.yml` |
| RabbitMQ | `localhost:5672` | 默认 `guest/guest`；管理台 http://localhost:15672 |

使用 Docker 时数据库会在首次启动时自动创建；`check_local_infra.py` 也会尝试创建 `novel_agent` 库。

## 2. 发布 Nacos 配置（首次或更新后）

```bash
cd novel-agent
python scripts/publish_nacos_config.py
```

配置模板见 `docs/deploy/nacos/*.yaml`。

## 3. 检查本机端口

```bash
python scripts/check_local_infra.py
```

## 4. 启动服务

```bash
# 编译并安装到本地仓库
mvn -pl agent-auth -am install -DskipTests

# 认证服务（profile=local，端口 8081）
set SPRING_PROFILES_ACTIVE=local
mvn -pl agent-auth spring-boot:run -Dspring-boot.run.mainClass=com.novel.agent.auth.NovelAgentAuthApplication

# PyAI 对接服务（端口 8082）
mvn -pl agent-pyai -am install -DskipTests
mvn -pl agent-pyai spring-boot:run -Dspring-boot.run.mainClass=com.novel.agent.pyai.NovelAgentPyAiApplication

# 网关（端口 8080）
mvn -pl agent-gateway -am install -DskipTests
mvn -pl agent-gateway spring-boot:run -Dspring-boot.run.mainClass=com.novel.agent.gateway.NovelAgentGatewayApplication
```

可通过环境变量覆盖密码，避免写进文件：

```bash
set DB_PASSWORD=你的PG密码
set REDIS_PASSWORD=你的Redis密码
```

## 5. 验证

- Auth 健康：`http://localhost:8081/api/auth/info`（需带 token）
- 注册：`POST http://localhost:8081/api/auth/register`
- 登录：`POST http://localhost:8081/api/auth/login`
- Agent 流式入口（经网关鉴权路由）：`POST http://localhost:8080/api/agent/chat/stream`
